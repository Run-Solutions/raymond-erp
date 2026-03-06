#!/bin/bash

# ╔════════════════════════════════════════════════════════════╗
# ║   DEPLOY RÁPIDO Y PROFESIONAL - RAYMOND ERP                ║
# ║   Optimizado para servidor Docker-only                    ║
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
echo -e "${CYAN}║   DEPLOY RÁPIDO - RAYMOND ERP                               ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📋 Configuración:${NC}"
echo "   Servidor: ${SERVER}"
echo "   Versión: ${VERSION}"
echo "   Tag: ${IMAGE_TAG}"
echo ""

# ============================================================
# PASO 1: Verificaciones rápidas
# ============================================================
echo -e "${BLUE}🔍 Verificaciones...${NC}"

if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker no está corriendo${NC}"
    exit 1
fi

if ! ssh -o ConnectTimeout=5 ${SERVER} "echo 'OK'" > /dev/null 2>&1; then
    echo -e "${RED}❌ No se pudo conectar al servidor${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Verificaciones OK${NC}"
echo ""

# ============================================================
# PASO 2: Build paralelo de imágenes (más rápido)
# ============================================================
echo -e "${BLUE}🐳 Construyendo imágenes Docker (paralelo)...${NC}"

# Build en paralelo usando background jobs
(
    echo "   📦 Construyendo raymond-api..."
    docker build \
        --platform linux/amd64 \
        --tag raymond-api:${IMAGE_TAG} \
        --tag raymond-api:latest \
        --file apps/api/Dockerfile \
        --quiet \
        . > /tmp/api-build.log 2>&1
    echo "   ✅ raymond-api lista"
) &
API_PID=$!

(
    echo "   📦 Construyendo raymond-web..."
    if docker build \
        --platform linux/amd64 \
        --build-arg NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL}" \
        --tag raymond-web:${IMAGE_TAG} \
        --tag raymond-web:latest \
        --file apps/web/Dockerfile \
        --progress=plain \
        . > /tmp/web-build.log 2>&1; then
        echo "   ✅ raymond-web lista"
    else
        echo "   ❌ raymond-web falló - revisando logs..."
        tail -100 /tmp/web-build.log
        exit 1
    fi
) &
WEB_PID=$!

# Esperar a que ambos builds terminen
wait $API_PID
API_EXIT=$?
wait $WEB_PID
WEB_EXIT=$?

if [ $API_EXIT -ne 0 ]; then
    echo -e "${RED}❌ Error en build de raymond-api${NC}"
    cat /tmp/api-build.log
    exit 1
fi

if [ $WEB_EXIT -ne 0 ]; then
    echo -e "${RED}❌ Error en build de raymond-web${NC}"
    cat /tmp/web-build.log
    exit 1
fi

echo -e "${GREEN}✅ Imágenes construidas${NC}"
echo ""

# ============================================================
# PASO 3: Guardar y comprimir imágenes
# ============================================================
echo -e "${BLUE}💾 Guardando y comprimiendo imágenes...${NC}"

TEMP_DIR=$(mktemp -d)
API_IMAGE_FILE="${TEMP_DIR}/raymond-api-${IMAGE_TAG}.tar"
WEB_IMAGE_FILE="${TEMP_DIR}/raymond-web-${IMAGE_TAG}.tar"

# Guardar en paralelo
docker save raymond-api:${IMAGE_TAG} -o "${API_IMAGE_FILE}" &
docker save raymond-web:${IMAGE_TAG} -o "${WEB_IMAGE_FILE}" &
wait

# Comprimir en paralelo
gzip -f "${API_IMAGE_FILE}" &
gzip -f "${WEB_IMAGE_FILE}" &
wait

API_SIZE=$(du -h "${API_IMAGE_FILE}.gz" | cut -f1)
WEB_SIZE=$(du -h "${WEB_IMAGE_FILE}.gz" | cut -f1)

echo -e "${GREEN}✅ Imágenes guardadas: API=${API_SIZE}, Web=${WEB_SIZE}${NC}"
echo ""

# ============================================================
# PASO 4: Subir imágenes al servidor (paralelo)
# ============================================================
echo -e "${BLUE}📤 Subiendo imágenes al servidor (paralelo)...${NC}"

ssh ${SERVER} "mkdir -p ${REMOTE_DIR}/docker-images"

# Subir en paralelo
scp "${API_IMAGE_FILE}.gz" ${SERVER}:${REMOTE_DIR}/docker-images/ &
scp "${WEB_IMAGE_FILE}.gz" ${SERVER}:${REMOTE_DIR}/docker-images/ &
wait

echo -e "${GREEN}✅ Imágenes subidas${NC}"
echo ""

# ============================================================
# PASO 5: Cargar y deploy en servidor (todo en uno)
# ============================================================
echo -e "${BLUE}🚀 Cargando imágenes y desplegando...${NC}"

ssh ${SERVER} << ENDSSH
set -e
cd ${REMOTE_DIR}/docker-images

# Descomprimir y cargar
gunzip -f raymond-api-${IMAGE_TAG}.tar.gz 2>/dev/null || true
gunzip -f raymond-web-${IMAGE_TAG}.tar.gz 2>/dev/null || true

docker load -i raymond-api-${IMAGE_TAG}.tar
docker load -i raymond-web-${IMAGE_TAG}.tar

# Tag como latest
docker tag raymond-api:${IMAGE_TAG} raymond-api:latest
docker tag raymond-web:${IMAGE_TAG} raymond-web:latest

# Limpiar imágenes antiguas (mantener solo últimas 2)
docker images --format "{{.Repository}}:{{.Tag}}" | grep "raymond-api:" | grep -v "${IMAGE_TAG}" | grep -v "latest" | tail -n +3 | xargs -r docker rmi 2>/dev/null || true
docker images --format "{{.Repository}}:{{.Tag}}" | grep "raymond-web:" | grep -v "${IMAGE_TAG}" | grep -v "latest" | tail -n +3 | xargs -r docker rmi 2>/dev/null || true

# Limpiar archivos .tar antiguos
ls -t raymond-api-*.tar 2>/dev/null | tail -n +3 | xargs -r rm -f || true
ls -t raymond-web-*.tar 2>/dev/null | tail -n +3 | xargs -r rm -f || true

# Deploy
cd ${REMOTE_DIR}

# Backup rápido de BD
if [ -f "./scripts/backup-production-simple.sh" ]; then
    ./scripts/backup-production-simple.sh > /dev/null 2>&1 || true
fi

# Detener servicios
docker compose -f docker compose.prod.images.yml down || true

# Migrar BD - Usar npx con versión específica de Prisma para evitar descargar la versión 7.x
docker compose -f docker compose.prod.images.yml run --rm api npx -y prisma@5.19.1 migrate deploy || echo "⚠️  Migraciones fallaron"

# Levantar servicios
docker compose -f docker compose.prod.images.yml up -d

# Verificar
sleep 5
docker compose -f docker compose.prod.images.yml ps

echo "✅ Deploy completado"
ENDSSH

# Limpiar local
rm -rf "${TEMP_DIR}"

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   ✅ DEPLOY RÁPIDO COMPLETADO                             ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}📊 Resumen:${NC}"
echo "   ✅ Build paralelo (más rápido)"
echo "   ✅ Compresión paralela"
echo "   ✅ Upload paralelo"
echo "   ✅ Deploy automático"
echo ""
echo -e "${BLUE}⏱️  Tiempo total: ~$(($SECONDS / 60)) minutos${NC}"
echo ""

