#!/bin/bash

# Script para construir solo el Web con la URL correcta de la API
# Uso: ./scripts/build-web-only.sh

set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

SERVER=${1:-"${DEPLOY_SERVER:-root@example.com}"}
REMOTE_DIR=${2:-"/root/raymond"}
VERSION=$(node -p "require('./package.json').version")

# URL de la API (debe ser el dominio, no localhost)
NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-"https://raymond.runsolutions-services.com/api"}

echo "🐳 RAYMOND ERP - Build Solo Web"
echo "============================================"
echo "Servidor: ${SERVER}"
echo "Versión: ${VERSION}"
echo "NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}"
echo ""

# Verificar que Docker está corriendo
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Docker no está corriendo${NC}"
    exit 1
fi

# Configurar buildx
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
export DOCKER_DEFAULT_PLATFORM=linux/amd64

# Construir solo el Web con el argumento correcto
echo -e "${BLUE}📦 Construyendo imagen de Web...${NC}"
echo -e "${YELLOW}   Usando NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}${NC}"
echo ""

docker build \
    --platform linux/amd64 \
    --build-arg NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL}" \
    -f apps/web/Dockerfile \
    -t raymond-web:latest \
    .

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error al construir la imagen${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Imagen construida exitosamente${NC}"

# Guardar imagen
echo ""
echo -e "${BLUE}💾 Guardando imagen...${NC}"
TEMP_DIR=$(mktemp -d)
WEB_IMAGE_FILE="${TEMP_DIR}/raymond-web-${VERSION}.tar"
docker save raymond-web:latest -o "${WEB_IMAGE_FILE}"
WEB_SIZE=$(du -h "${WEB_IMAGE_FILE}" | cut -f1)
echo -e "${GREEN}✅ Imagen guardada: ${WEB_SIZE}${NC}"

# Subir al servidor
echo ""
echo -e "${BLUE}📤 Subiendo imagen al servidor...${NC}"
ssh ${SERVER} "mkdir -p ${REMOTE_DIR}/docker-images"
scp "${WEB_IMAGE_FILE}" ${SERVER}:${REMOTE_DIR}/docker-images/

# Cargar en el servidor
echo ""
echo -e "${BLUE}📥 Cargando imagen en el servidor...${NC}"
ssh ${SERVER} "cd ${REMOTE_DIR}/docker-images && docker load -i raymond-web-${VERSION}.tar"

# Limpiar
rm -rf "${TEMP_DIR}"

echo ""
echo -e "${GREEN}✅ Proceso completado!${NC}"
echo ""
echo "Para desplegar en el servidor:"
echo "  ssh ${SERVER}"
echo "  cd ${REMOTE_DIR}"
echo "  docker compose -f docker compose.prod.images.yml up -d web"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE: La imagen fue construida con NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}${NC}"
echo "   Si cambias esta URL, necesitas reconstruir la imagen."
