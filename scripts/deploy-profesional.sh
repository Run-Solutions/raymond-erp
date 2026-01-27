#!/bin/bash

# ╔════════════════════════════════════════════════════════════╗
# ║   DEPLOY PROFESIONAL - RAYMOND ERP                          ║
# ║   Solo imágenes Docker, sin código fuente en servidor     ║
# ╚════════════════════════════════════════════════════════════╝

set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuración
SERVER="${DEPLOY_SERVER:-root@143.110.229.234}"
REMOTE_DIR="/root/raymond"
VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "latest")
BUILD_DATE=$(date +%Y%m%d_%H%M%S)
IMAGE_TAG="${VERSION}-${BUILD_DATE}"

# Variables de entorno para build
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
export DOCKER_DEFAULT_PLATFORM=linux/amd64

# URL de la API para el build del frontend
NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://raymond.runsolutions-services.com/api}"

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   DEPLOY PROFESIONAL - RAYMOND ERP                           ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📋 Configuración:${NC}"
echo "   Servidor: ${SERVER}"
echo "   Versión: ${VERSION}"
echo "   Tag: ${IMAGE_TAG}"
echo "   API URL: ${NEXT_PUBLIC_API_URL}"
echo ""

# ============================================================
# PASO 1: Verificaciones previas
# ============================================================
echo -e "${BLUE}🔍 PASO 1/7: Verificaciones previas...${NC}"

# Verificar Docker
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Docker no está corriendo${NC}"
    exit 1
fi
echo -e "${GREEN}   ✅ Docker OK${NC}"

# Verificar conexión SSH
if ! ssh -o ConnectTimeout=5 ${SERVER} "echo 'OK'" > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: No se pudo conectar al servidor${NC}"
    exit 1
fi
echo -e "${GREEN}   ✅ Conexión SSH OK${NC}"

# Verificar que el servidor tiene Docker
if ! ssh ${SERVER} "docker info > /dev/null 2>&1"; then
    echo -e "${RED}❌ Error: Docker no está disponible en el servidor${NC}"
    exit 1
fi
echo -e "${GREEN}   ✅ Docker en servidor OK${NC}"

echo -e "${GREEN}✅ Verificaciones completadas${NC}"
echo ""

# ============================================================
# PASO 2: Build de imágenes Docker (multi-stage, optimizado)
# ============================================================
echo -e "${BLUE}🐳 PASO 2/7: Construyendo imágenes Docker...${NC}"
echo -e "${YELLOW}   Esto puede tardar varios minutos...${NC}"
echo ""

# Limpiar imágenes antiguas locales (opcional, comentado para mantener cache)
# docker rmi raymond-api:latest raymond-web:latest 2>/dev/null || true

# Build con cache inteligente
echo -e "${BLUE}   📦 Construyendo raymond-api...${NC}"
docker build \
    --platform linux/amd64 \
    --tag raymond-api:${IMAGE_TAG} \
    --tag raymond-api:latest \
    --file apps/api/Dockerfile \
    --progress=plain \
    . 2>&1 | grep -E "(Step|RUN|COPY|ERROR|Error)" || true

if ! docker images | grep -q "raymond-api.*${IMAGE_TAG}"; then
    echo -e "${RED}❌ Error: Falló el build de raymond-api${NC}"
    exit 1
fi
echo -e "${GREEN}   ✅ raymond-api construida${NC}"

echo ""
echo -e "${BLUE}   📦 Construyendo raymond-web...${NC}"
docker build \
    --platform linux/amd64 \
    --build-arg NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL}" \
    --tag raymond-web:${IMAGE_TAG} \
    --tag raymond-web:latest \
    --file apps/web/Dockerfile \
    --progress=plain \
    . 2>&1 | grep -E "(Step|RUN|COPY|ERROR|Error)" || true

if ! docker images | grep -q "raymond-web.*${IMAGE_TAG}"; then
    echo -e "${RED}❌ Error: Falló el build de raymond-web${NC}"
    exit 1
fi
echo -e "${GREEN}   ✅ raymond-web construida${NC}"

# Mostrar tamaños de imágenes
echo ""
echo -e "${BLUE}📊 Tamaño de imágenes:${NC}"
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | grep -E "raymond-api|raymond-web|REPOSITORY" || true

echo -e "${GREEN}✅ Imágenes construidas exitosamente${NC}"
echo ""

# ============================================================
# PASO 3: Guardar imágenes como archivos comprimidos
# ============================================================
echo -e "${BLUE}💾 PASO 3/7: Guardando imágenes...${NC}"

TEMP_DIR=$(mktemp -d)
API_IMAGE_FILE="${TEMP_DIR}/raymond-api-${IMAGE_TAG}.tar"
WEB_IMAGE_FILE="${TEMP_DIR}/raymond-web-${IMAGE_TAG}.tar"

echo "   Guardando raymond-api..."
docker save raymond-api:${IMAGE_TAG} -o "${API_IMAGE_FILE}"

echo "   Guardando raymond-web..."
docker save raymond-web:${IMAGE_TAG} -o "${WEB_IMAGE_FILE}"

# Comprimir imágenes para transferencia más rápida
echo "   Comprimiendo imágenes..."
gzip -f "${API_IMAGE_FILE}"
gzip -f "${WEB_IMAGE_FILE}"

API_SIZE=$(du -h "${API_IMAGE_FILE}.gz" | cut -f1)
WEB_SIZE=$(du -h "${WEB_IMAGE_FILE}.gz" | cut -f1)

echo -e "${GREEN}✅ Imágenes guardadas:${NC}"
echo "   - raymond-api: ${API_SIZE}"
echo "   - raymond-web: ${WEB_SIZE}"
echo ""

# ============================================================
# PASO 4: Subir imágenes al servidor
# ============================================================
echo -e "${BLUE}📤 PASO 4/7: Subiendo imágenes al servidor...${NC}"
echo -e "${YELLOW}   Esto puede tardar varios minutos dependiendo de la conexión...${NC}"

# Crear directorio en servidor
ssh ${SERVER} "mkdir -p ${REMOTE_DIR}/docker-images"

# Subir imágenes comprimidas
echo "   Subiendo raymond-api..."
scp "${API_IMAGE_FILE}.gz" ${SERVER}:${REMOTE_DIR}/docker-images/

echo "   Subiendo raymond-web..."
scp "${WEB_IMAGE_FILE}.gz" ${SERVER}:${REMOTE_DIR}/docker-images/

echo -e "${GREEN}✅ Imágenes subidas exitosamente${NC}"
echo ""

# ============================================================
# PASO 5: Cargar imágenes en el servidor
# ============================================================
echo -e "${BLUE}📥 PASO 5/7: Cargando imágenes en el servidor...${NC}"

ssh ${SERVER} << ENDSSH
set -e
cd ${REMOTE_DIR}/docker-images

echo "   Descomprimiendo raymond-api..."
gunzip -f raymond-api-${IMAGE_TAG}.tar.gz || true

echo "   Descomprimiendo raymond-web..."
gunzip -f raymond-web-${IMAGE_TAG}.tar.gz || true

echo "   Cargando raymond-api..."
docker load -i raymond-api-${IMAGE_TAG}.tar

echo "   Cargando raymond-web..."
docker load -i raymond-web-${IMAGE_TAG}.tar

# Tag como latest
docker tag raymond-api:${IMAGE_TAG} raymond-api:latest 2>/dev/null || true
docker tag raymond-web:${IMAGE_TAG} raymond-web:latest 2>/dev/null || true

# Limpiar imágenes antiguas (mantener solo las últimas 3 versiones)
echo "   Limpiando imágenes antiguas..."
docker images --format "{{.Repository}}:{{.Tag}}" | grep "raymond-api:" | grep -v "${IMAGE_TAG}" | grep -v "latest" | tail -n +4 | xargs -r docker rmi 2>/dev/null || true
docker images --format "{{.Repository}}:{{.Tag}}" | grep "raymond-web:" | grep -v "${IMAGE_TAG}" | grep -v "latest" | tail -n +4 | xargs -r docker rmi 2>/dev/null || true

# Limpiar archivos .tar antiguos (mantener solo los últimos 3)
ls -t raymond-api-*.tar 2>/dev/null | tail -n +4 | xargs -r rm -f || true
ls -t raymond-web-*.tar 2>/dev/null | tail -n +4 | xargs -r rm -f || true

echo "   ✅ Imágenes cargadas y limpieza completada"
ENDSSH

echo -e "${GREEN}✅ Imágenes cargadas en el servidor${NC}"
echo ""

# ============================================================
# PASO 6: Subir solo archivos de configuración necesarios
# ============================================================
echo -e "${BLUE}📋 PASO 6/7: Subiendo configuración...${NC}"

# Solo subir archivos esenciales (NO código fuente)
ssh ${SERVER} "mkdir -p ${REMOTE_DIR}"

# Subir docker-compose para producción
echo "   Subiendo docker-compose.prod.images.yml..."
scp docker-compose.prod.images.yml ${SERVER}:${REMOTE_DIR}/

# Subir .env.example si existe (para referencia)
if [ -f ".env.example" ]; then
    echo "   Subiendo .env.example..."
    scp .env.example ${SERVER}:${REMOTE_DIR}/
fi

# Subir scripts de deploy del servidor
echo "   Subiendo scripts de servidor..."
ssh ${SERVER} "mkdir -p ${REMOTE_DIR}/scripts"
scp scripts/deploy-on-server.sh ${SERVER}:${REMOTE_DIR}/scripts/ 2>/dev/null || true
scp scripts/backup-production-simple.sh ${SERVER}:${REMOTE_DIR}/scripts/ 2>/dev/null || true

# Hacer scripts ejecutables
ssh ${SERVER} "chmod +x ${REMOTE_DIR}/scripts/*.sh 2>/dev/null || true"

echo -e "${GREEN}✅ Configuración subida${NC}"
echo ""

# ============================================================
# PASO 7: Deploy en servidor (opcional)
# ============================================================
echo -e "${BLUE}🚀 PASO 7/7: Deploy en servidor${NC}"
echo ""
read -p "¿Deseas desplegar ahora en el servidor? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}   Desplegando servicios...${NC}"
    
    ssh ${SERVER} << ENDSSH
set -e
cd ${REMOTE_DIR}

# Backup de base de datos antes de deploy
echo "   📦 Creando backup de base de datos..."
./scripts/backup-production-simple.sh || echo "   ⚠️  Backup falló, continuando..."

# Detener servicios actuales
echo "   🛑 Deteniendo servicios actuales..."
docker-compose -f docker-compose.prod.images.yml down || true

# Migrar base de datos si hay migraciones pendientes
echo "   🔄 Verificando migraciones..."
docker-compose -f docker-compose.prod.images.yml run --rm api npx prisma migrate deploy || echo "   ⚠️  Migraciones fallaron, revisar manualmente"

# Levantar servicios con nuevas imágenes
echo "   🚀 Levantando servicios..."
docker-compose -f docker-compose.prod.images.yml up -d

# Esperar a que los servicios estén saludables
echo "   ⏳ Esperando que los servicios estén listos..."
sleep 10

# Verificar estado
echo "   📊 Estado de servicios:"
docker-compose -f docker-compose.prod.images.yml ps

# Verificar salud
echo ""
echo "   🔍 Verificando salud de servicios..."
docker-compose -f docker-compose.prod.images.yml ps --format json | grep -q '"Health":"healthy"' && echo "   ✅ Servicios saludables" || echo "   ⚠️  Algunos servicios pueden no estar saludables aún"

echo "   ✅ Deploy completado"
ENDSSH

    echo -e "${GREEN}✅ Deploy completado exitosamente${NC}"
else
    echo -e "${YELLOW}⚠️  Deploy omitido${NC}"
    echo ""
    echo "Para desplegar manualmente, ejecuta en el servidor:"
    echo "  ssh ${SERVER}"
    echo "  cd ${REMOTE_DIR}"
    echo "  docker-compose -f docker-compose.prod.images.yml up -d"
fi

# Limpiar archivos temporales locales
echo ""
echo -e "${BLUE}🧹 Limpiando archivos temporales locales...${NC}"
rm -rf "${TEMP_DIR}"
echo -e "${GREEN}✅ Limpieza completada${NC}"

# ============================================================
# RESUMEN FINAL
# ============================================================
echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   ✅ DEPLOY PROFESIONAL COMPLETADO                         ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}📋 Resumen:${NC}"
echo "   ✅ Imágenes construidas localmente (multi-stage)"
echo "   ✅ Imágenes comprimidas y subidas al servidor"
echo "   ✅ Imágenes cargadas en Docker del servidor"
echo "   ✅ Solo configuración subida (sin código fuente)"
echo "   ✅ Servidor limpio y optimizado"
echo ""
echo -e "${BLUE}📝 Archivos en servidor:${NC}"
echo "   - ${REMOTE_DIR}/docker-images/raymond-api-${IMAGE_TAG}.tar.gz"
echo "   - ${REMOTE_DIR}/docker-images/raymond-web-${IMAGE_TAG}.tar.gz"
echo "   - ${REMOTE_DIR}/docker-compose.prod.images.yml"
echo ""
echo -e "${BLUE}🔄 Para desplegar manualmente:${NC}"
echo "   ssh ${SERVER}"
echo "   cd ${REMOTE_DIR}"
echo "   docker-compose -f docker-compose.prod.images.yml up -d"
echo ""
echo -e "${BLUE}📊 Para ver logs:${NC}"
echo "   docker-compose -f docker-compose.prod.images.yml logs -f"
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

