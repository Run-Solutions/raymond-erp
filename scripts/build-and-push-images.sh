#!/bin/bash

# Script para build, tag y push de imágenes Docker a registry
# Uso: ./scripts/build-and-push-images.sh [registry] [version]
# Ejemplo: ./scripts/build-and-push-images.sh docker.io/tu-usuario v3.0.3

set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuración
REGISTRY=${1:-"docker.io/tu-usuario"}  # Cambiar por tu registry (Docker Hub o GHCR)
VERSION=${2:-"$(node -p "require('./package.json').version")"}  # Lee versión de package.json
LATEST_TAG="latest"

echo "🐳 RAYMOND ERP - Build y Push de Imágenes Docker"
echo "================================================"
echo "Registry: ${REGISTRY}"
echo "Versión: ${VERSION}"
echo ""

# Verificar que Docker está corriendo
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Docker no está corriendo${NC}"
    exit 1
fi

# Verificar que estás logueado en el registry
echo -e "${BLUE}🔐 Verificando autenticación en registry...${NC}"
if [[ "$REGISTRY" == *"docker.io"* ]]; then
    echo "   Registry: Docker Hub"
    echo "   Verifica que estés logueado con: docker login"
elif [[ "$REGISTRY" == *"ghcr.io"* ]]; then
    echo "   Registry: GitHub Container Registry"
    echo "   Verifica que estés logueado con: echo \$GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin"
else
    echo -e "${YELLOW}⚠️  Registry personalizado: ${REGISTRY}${NC}"
    echo "   Asegúrate de estar autenticado"
fi

read -p "¿Estás autenticado en el registry? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠️  Autenticación requerida. Ejecuta:${NC}"
    if [[ "$REGISTRY" == *"docker.io"* ]]; then
        echo "   docker login"
    elif [[ "$REGISTRY" == *"ghcr.io"* ]]; then
        echo "   echo \$GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin"
    fi
    exit 1
fi

# Paso 1: Build de imágenes
echo ""
echo -e "${BLUE}📦 Paso 1/4: Construyendo imágenes Docker...${NC}"
docker compose -f docker-compose.prod.yml build --no-cache

# Verificar que las imágenes se construyeron
if ! docker images | grep -q "raymond-api"; then
    echo -e "${RED}❌ Error: No se encontró la imagen raymond-api${NC}"
    exit 1
fi

if ! docker images | grep -q "raymond-web"; then
    echo -e "${RED}❌ Error: No se encontró la imagen raymond-web${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Imágenes construidas exitosamente${NC}"

# Paso 2: Tag de imágenes con versión
echo ""
echo -e "${BLUE}🏷️  Paso 2/4: Etiquetando imágenes...${NC}"

# API
docker tag raymond-api:latest ${REGISTRY}/raymond-api:${VERSION}
docker tag raymond-api:latest ${REGISTRY}/raymond-api:${LATEST_TAG}
echo -e "${GREEN}✅ raymond-api etiquetada como:${NC}"
echo "   - ${REGISTRY}/raymond-api:${VERSION}"
echo "   - ${REGISTRY}/raymond-api:${LATEST_TAG}"

# Web
docker tag raymond-web:latest ${REGISTRY}/raymond-web:${VERSION}
docker tag raymond-web:latest ${REGISTRY}/raymond-web:${LATEST_TAG}
echo -e "${GREEN}✅ raymond-web etiquetada como:${NC}"
echo "   - ${REGISTRY}/raymond-web:${VERSION}"
echo "   - ${REGISTRY}/raymond-web:${LATEST_TAG}"

# Paso 3: Push de imágenes
echo ""
echo -e "${BLUE}📤 Paso 3/4: Subiendo imágenes al registry...${NC}"

# Push API
echo "   Subiendo raymond-api:${VERSION}..."
docker push ${REGISTRY}/raymond-api:${VERSION}
echo "   Subiendo raymond-api:${LATEST_TAG}..."
docker push ${REGISTRY}/raymond-api:${LATEST_TAG}

# Push Web
echo "   Subiendo raymond-web:${VERSION}..."
docker push ${REGISTRY}/raymond-web:${VERSION}
echo "   Subiendo raymond-web:${LATEST_TAG}..."
docker push ${REGISTRY}/raymond-web:${LATEST_TAG}

echo -e "${GREEN}✅ Imágenes subidas exitosamente${NC}"

# Paso 4: Resumen
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}✅ Build y Push completado exitosamente!${NC}"
echo ""
echo -e "${BLUE}📋 Imágenes disponibles en:${NC}"
echo "   - ${REGISTRY}/raymond-api:${VERSION}"
echo "   - ${REGISTRY}/raymond-api:${LATEST_TAG}"
echo "   - ${REGISTRY}/raymond-web:${VERSION}"
echo "   - ${REGISTRY}/raymond-web:${LATEST_TAG}"
echo ""
echo -e "${BLUE}📝 Próximos pasos:${NC}"
echo "   1. Actualiza docker-compose.prod.yml en el servidor con estas imágenes"
echo "   2. Ejecuta en el servidor: ./scripts/deploy-from-registry.sh ${REGISTRY} ${VERSION}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
