#!/bin/bash

# Script para construir solo la API (más rápido que construir todo)
# Uso: ./scripts/build-api-only.sh

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

echo "🐳 RAYMOND ERP - Build Solo API"
echo "============================================"
echo "Servidor: ${SERVER}"
echo "Versión: ${VERSION}"
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

# Construir solo la API
echo -e "${BLUE}📦 Construyendo imagen de API...${NC}"
docker build \
    --platform linux/amd64 \
    -f apps/api/Dockerfile \
    -t raymond-api:latest \
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
API_IMAGE_FILE="${TEMP_DIR}/raymond-api-${VERSION}.tar"
docker save raymond-api:latest -o "${API_IMAGE_FILE}"
API_SIZE=$(du -h "${API_IMAGE_FILE}" | cut -f1)
echo -e "${GREEN}✅ Imagen guardada: ${API_SIZE}${NC}"

# Subir al servidor
echo ""
echo -e "${BLUE}📤 Subiendo imagen al servidor...${NC}"
ssh ${SERVER} "mkdir -p ${REMOTE_DIR}/docker-images"
scp "${API_IMAGE_FILE}" ${SERVER}:${REMOTE_DIR}/docker-images/

# Cargar en el servidor
echo ""
echo -e "${BLUE}📥 Cargando imagen en el servidor...${NC}"
ssh ${SERVER} "cd ${REMOTE_DIR}/docker-images && docker load -i raymond-api-${VERSION}.tar"

# Limpiar
rm -rf "${TEMP_DIR}"

echo ""
echo -e "${GREEN}✅ Proceso completado!${NC}"
echo ""
echo "Para desplegar en el servidor:"
echo "  ssh ${SERVER}"
echo "  cd ${REMOTE_DIR}"
echo "  docker-compose -f docker-compose.prod.images.yml up -d api"
