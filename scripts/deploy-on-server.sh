#!/bin/bash

# Script para ejecutar en el servidor después de recibir las imágenes
# Uso: ./scripts/deploy-on-server.sh

set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

REMOTE_DIR="/root/raymond"

echo -e "${BLUE}🚀 DEPLOY EN SERVIDOR - RAYMOND ERP${NC}"
echo "============================================"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "${REMOTE_DIR}/docker-compose.prod.images.yml" ]; then
    echo -e "${RED}❌ Error: No se encontró docker-compose.prod.images.yml${NC}"
    echo "   Asegúrate de estar en el directorio correcto"
    exit 1
fi

cd ${REMOTE_DIR}

# Verificar que las imágenes existen
if ! docker images | grep -q "raymond-api.*latest"; then
    echo -e "${RED}❌ Error: No se encontró la imagen raymond-api:latest${NC}"
    echo "   Asegúrate de haber cargado las imágenes primero"
    exit 1
fi

if ! docker images | grep -q "raymond-web.*latest"; then
    echo -e "${RED}❌ Error: No se encontró la imagen raymond-web:latest${NC}"
    echo "   Asegúrate de haber cargado las imágenes primero"
    exit 1
fi

# Backup de base de datos
echo -e "${BLUE}📦 Creando backup de base de datos...${NC}"
if [ -f "./scripts/backup-production-simple.sh" ]; then
    ./scripts/backup-production-simple.sh || echo -e "${YELLOW}   ⚠️  Backup falló, continuando...${NC}"
else
    echo -e "${YELLOW}   ⚠️  Script de backup no encontrado, omitiendo...${NC}"
fi
echo ""

# Detener servicios actuales
echo -e "${BLUE}🛑 Deteniendo servicios actuales...${NC}"
docker-compose -f docker-compose.prod.images.yml down || true
echo ""

# Migrar base de datos
echo -e "${BLUE}🔄 Ejecutando migraciones de base de datos...${NC}"
docker-compose -f docker-compose.prod.images.yml run --rm api npx prisma migrate deploy || {
    echo -e "${YELLOW}   ⚠️  Migraciones fallaron, revisar manualmente${NC}"
    echo "   Para revisar: docker-compose -f docker-compose.prod.images.yml run --rm api npx prisma migrate status"
}
echo ""

# Levantar servicios
echo -e "${BLUE}🚀 Levantando servicios...${NC}"
docker-compose -f docker-compose.prod.images.yml up -d

# Esperar a que los servicios estén listos
echo ""
echo -e "${BLUE}⏳ Esperando que los servicios estén listos...${NC}"
sleep 10

# Verificar estado
echo ""
echo -e "${BLUE}📊 Estado de servicios:${NC}"
docker-compose -f docker-compose.prod.images.yml ps

# Verificar salud
echo ""
echo -e "${BLUE}🔍 Verificando salud de servicios...${NC}"
sleep 5

API_HEALTH=$(docker-compose -f docker-compose.prod.images.yml ps api | grep -q "healthy" && echo "✅" || echo "⚠️")
WEB_HEALTH=$(docker-compose -f docker-compose.prod.images.yml ps web | grep -q "healthy" && echo "✅" || echo "⚠️")

echo "   API: ${API_HEALTH}"
echo "   Web: ${WEB_HEALTH}"

# Mostrar logs recientes si hay problemas
if [ "${API_HEALTH}" != "✅" ] || [ "${WEB_HEALTH}" != "✅" ]; then
    echo ""
    echo -e "${YELLOW}📋 Últimos logs (últimas 20 líneas):${NC}"
    docker-compose -f docker-compose.prod.images.yml logs --tail=20
fi

echo ""
echo -e "${GREEN}✅ Deploy completado${NC}"
echo ""
echo -e "${BLUE}📝 Comandos útiles:${NC}"
echo "   Ver logs: docker-compose -f docker-compose.prod.images.yml logs -f"
echo "   Ver estado: docker-compose -f docker-compose.prod.images.yml ps"
echo "   Reiniciar: docker-compose -f docker-compose.prod.images.yml restart"
echo "   Detener: docker-compose -f docker-compose.prod.images.yml down"

