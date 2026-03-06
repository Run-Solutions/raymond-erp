#!/bin/bash

# ===========================================
# Script para sincronizar solo el schema de Prisma desde producción
# ===========================================
# Este script sincroniza el schema de Prisma con la base de datos de producción
# sin necesidad de traer todo el código

set -e

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
API_DIR="${PROJECT_ROOT}/apps/api"

echo -e "${BLUE}🗄️  Sincronizando Schema de Prisma desde Producción${NC}"
echo "================================================"
echo ""

# Verificar que estamos conectados a producción
cd "${API_DIR}"

DB_URL="${DATABASE_URL:-$(grep DATABASE_URL "${PROJECT_ROOT}/.env" 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'")}"

if [ -z "$DB_URL" ]; then
    echo -e "${RED}❌ Error: DATABASE_URL no encontrada${NC}"
    echo "   Asegúrate de tener el archivo .env configurado"
    exit 1
fi

# Verificar que la URL no esté vacía
if [ -z "$DB_URL" ]; then
    echo -e "${YELLOW}⚠️  Advertencia: DATABASE_URL no apunta a producción${NC}"
    echo "   URL actual: ${DB_URL:0:50}..."
    read -p "   ¿Continuar de todas formas? (s/N): " CONFIRM
    if [[ ! "$CONFIRM" =~ ^[Ss]$ ]]; then
        echo "   Operación cancelada"
        exit 0
    fi
fi

# Hacer backup del schema actual
if [ -f "prisma/schema.prisma" ]; then
    BACKUP_SCHEMA="prisma/schema.prisma.backup.$(date +%Y%m%d_%H%M%S)"
    cp "prisma/schema.prisma" "${BACKUP_SCHEMA}"
    echo -e "${GREEN}✅ Backup del schema guardado en: ${BACKUP_SCHEMA}${NC}\n"
fi

# Sincronizar schema desde producción
echo -e "${BLUE}🔄 Extrayendo schema desde base de datos de producción...${NC}"
npx prisma@5.19.1 db pull

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Schema de Prisma sincronizado${NC}\n"
else
    echo -e "${RED}❌ Error al sincronizar schema${NC}"
    if [ -f "${BACKUP_SCHEMA}" ]; then
        echo "   Restaurando backup..."
        cp "${BACKUP_SCHEMA}" "prisma/schema.prisma"
    fi
    exit 1
fi

# Regenerar cliente de Prisma
echo -e "${BLUE}🔧 Regenerando cliente de Prisma...${NC}"
npx prisma@5.19.1 generate

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Cliente de Prisma regenerado${NC}\n"
else
    echo -e "${RED}❌ Error al regenerar cliente de Prisma${NC}"
    exit 1
fi

# Mostrar diferencias si existe backup
if [ -f "${BACKUP_SCHEMA}" ]; then
    echo -e "${BLUE}📊 Comparando cambios...${NC}"
    if command -v diff &> /dev/null; then
        DIFF_COUNT=$(diff -u "${BACKUP_SCHEMA}" "prisma/schema.prisma" | grep -c "^[+-]" || true)
        if [ "$DIFF_COUNT" -gt 0 ]; then
            echo "   Se encontraron diferencias en el schema"
            echo "   Para ver los cambios: diff ${BACKUP_SCHEMA} prisma/schema.prisma"
        else
            echo "   No se encontraron cambios en el schema"
        fi
    fi
    echo ""
fi

echo -e "${GREEN}✅ Sincronización completada${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE: Revisa los cambios antes de hacer commit${NC}"
echo "   Archivo: apps/api/prisma/schema.prisma"
echo "   Backup: ${BACKUP_SCHEMA}"

