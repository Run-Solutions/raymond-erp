#!/bin/bash

# ===========================================
# SCRIPT PARA VERIFICAR SEGURIDAD DE MIGRACIONES
# ===========================================
# Revisa todas las migraciones pendientes por operaciones peligrosas

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
API_DIR="${PROJECT_ROOT}/apps/api"
MIGRATIONS_DIR="${API_DIR}/prisma/migrations"

echo -e "${BLUE}🔒 Verificando seguridad de migraciones${NC}"
echo "================================================"
echo ""

# Operaciones peligrosas que pueden borrar datos
# NOTA: DROP COLUMN y DROP CONSTRAINT pueden ser seguros si se recrean después
DANGEROUS_OPS=(
    "DROP TABLE"
    "DELETE FROM"
    "TRUNCATE"
)

# Operaciones que requieren atención (pero pueden ser seguras)
WARNING_OPS=(
    "DROP COLUMN"
    "DROP CONSTRAINT"
    "ALTER COLUMN.*DROP NOT NULL"
    "ALTER TABLE.*ALTER COLUMN"
    "RENAME"
    "CHANGE"
)

cd "$API_DIR"

# Verificar estado de migraciones
echo -e "${YELLOW}📋 Estado de migraciones:${NC}"
npx prisma@5.19.1 migrate status
echo ""

# Revisar cada migración
TOTAL_DANGEROUS=0
TOTAL_WARNINGS=0

for migration_dir in "$MIGRATIONS_DIR"/*/; do
    if [ -f "${migration_dir}migration.sql" ]; then
        migration_file="${migration_dir}migration.sql"
        migration_name=$(basename "$(dirname "$migration_file")")
        
        echo -e "${BLUE}📄 Revisando: $migration_name${NC}"
        
        # Buscar operaciones peligrosas
        for op in "${DANGEROUS_OPS[@]}"; do
            if grep -qiE "$op" "$migration_file"; then
                echo -e "${RED}   ⚠️  PELIGRO: $op${NC}"
                grep -iE "$op" "$migration_file" | sed 's/^/      /'
                TOTAL_DANGEROUS=$((TOTAL_DANGEROUS + 1))
            fi
        done
        
        # Buscar advertencias
        for op in "${WARNING_OPS[@]}"; do
            if grep -qiE "$op" "$migration_file"; then
                echo -e "${YELLOW}   ⚠️  ADVERTENCIA: $op${NC}"
                grep -iE "$op" "$migration_file" | head -2 | sed 's/^/      /'
                TOTAL_WARNINGS=$((TOTAL_WARNINGS + 1))
            fi
        done
        
        echo ""
    fi
done

# Resumen
echo "================================================"
if [ $TOTAL_DANGEROUS -eq 0 ] && [ $TOTAL_WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ No se encontraron operaciones peligrosas${NC}"
    echo -e "${GREEN}   Las migraciones son seguras para producción${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Resumen:${NC}"
    echo -e "${RED}   Operaciones peligrosas: $TOTAL_DANGEROUS${NC}"
    echo -e "${YELLOW}   Advertencias: $TOTAL_WARNINGS${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  Revisa las migraciones manualmente antes de ejecutar en producción${NC}"
    exit 1
fi

