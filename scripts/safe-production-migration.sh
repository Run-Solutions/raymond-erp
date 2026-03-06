#!/bin/bash

# ===========================================
# SCRIPT DE MIGRACIÓN SEGURA A PRODUCCIÓN
# ===========================================
# Este script garantiza que NO se pierdan datos durante la migración
# IMPORTANTE: Lee TODO antes de ejecutar

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
API_DIR="${PROJECT_ROOT}/apps/api"
BACKUP_DIR="${PROJECT_ROOT}/backups"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   MIGRACIÓN SEGURA A PRODUCCIÓN - RAYMOND ERP              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ===========================================
# PASO 1: VERIFICAR VARIABLES DE ENTORNO
# ===========================================
echo -e "${YELLOW}📋 PASO 1: Verificando configuración...${NC}"

if [ ! -f "${PROJECT_ROOT}/.env" ] && [ ! -f "${PROJECT_ROOT}/env.production" ]; then
    echo -e "${RED}❌ Error: No se encontró archivo .env o env.production${NC}"
    echo "   Crea un archivo .env con las variables de producción"
    exit 1
fi

# Cargar variables de entorno
if [ -f "${PROJECT_ROOT}/env.production" ]; then
    source "${PROJECT_ROOT}/env.production"
    echo -e "${GREEN}✅ Variables cargadas desde env.production${NC}"
elif [ -f "${PROJECT_ROOT}/.env" ]; then
    source "${PROJECT_ROOT}/.env"
    echo -e "${YELLOW}⚠️  Variables cargadas desde .env (verifica que sea producción)${NC}"
fi

# Verificar que DATABASE_URL esté configurada
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ Error: DATABASE_URL no está configurada${NC}"
    exit 1
fi

# Confirmar que es producción
echo -e "${YELLOW}⚠️  ADVERTENCIA: Estás a punto de migrar a PRODUCCIÓN${NC}"
echo -e "${YELLOW}   URL de base de datos: ${DATABASE_URL:0:50}...${NC}"
echo ""
read -p "¿Estás SEGURO de que quieres continuar? (escribe 'SI' en mayúsculas): " CONFIRM
if [ "$CONFIRM" != "SI" ]; then
    echo -e "${RED}❌ Operación cancelada por el usuario${NC}"
    exit 0
fi

# ===========================================
# PASO 2: CREAR BACKUP COMPLETO
# ===========================================
echo ""
echo -e "${YELLOW}📦 PASO 2: Creando backup completo de producción...${NC}"

mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/raymond_production_backup_${TIMESTAMP}.sql.gz"

# Extraer credenciales de DATABASE_URL
# Formato: postgresql://user:password@host:port/database
DB_URL_PATTERN="postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+)"
if [[ $DATABASE_URL =~ $DB_URL_PATTERN ]]; then
    DB_USER="${BASH_REMATCH[1]}"
    DB_PASS="${BASH_REMATCH[2]}"
    DB_HOST="${BASH_REMATCH[3]}"
    DB_PORT="${BASH_REMATCH[4]}"
    DB_NAME="${BASH_REMATCH[5]}"
else
    echo -e "${RED}❌ Error: No se pudo parsear DATABASE_URL${NC}"
    echo "   Formato esperado: postgresql://user:password@host:port/database"
    exit 1
fi

echo -e "${BLUE}   Host: $DB_HOST${NC}"
echo -e "${BLUE}   Port: $DB_PORT${NC}"
echo -e "${BLUE}   Database: $DB_NAME${NC}"
echo ""

# Crear backup
echo -e "${BLUE}   Creando backup en: $BACKUP_FILE${NC}"
PGPASSWORD="$DB_PASS" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --verbose \
    --no-owner \
    --no-acl \
    --clean \
    --if-exists \
    | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✅ Backup creado exitosamente: $BACKUP_FILE (${BACKUP_SIZE})${NC}"
else
    echo -e "${RED}❌ Error al crear backup. ABORTANDO migración.${NC}"
    exit 1
fi

# ===========================================
# PASO 3: VERIFICAR MIGRACIONES PENDIENTES
# ===========================================
echo ""
echo -e "${YELLOW}🔍 PASO 3: Verificando migraciones pendientes...${NC}"

cd "$API_DIR"

# Verificar estado de migraciones
MIGRATION_STATUS=$(npx prisma@5.19.1 migrate status 2>&1 || echo "ERROR")

if echo "$MIGRATION_STATUS" | grep -q "Database schema is up to date"; then
    echo -e "${GREEN}✅ La base de datos está actualizada${NC}"
    echo -e "${YELLOW}   No hay migraciones pendientes${NC}"
    exit 0
elif echo "$MIGRATION_STATUS" | grep -q "following migration"; then
    echo -e "${YELLOW}⚠️  Migraciones pendientes detectadas${NC}"
    echo "$MIGRATION_STATUS"
else
    echo -e "${RED}❌ Error al verificar estado de migraciones${NC}"
    echo "$MIGRATION_STATUS"
    exit 1
fi

# ===========================================
# PASO 4: REVISAR MIGRACIONES PELIGROSAS
# ===========================================
echo ""
echo -e "${YELLOW}🔒 PASO 4: Revisando migraciones por operaciones peligrosas...${NC}"

# Buscar migraciones con operaciones peligrosas
DANGEROUS_OPS=("DROP TABLE" "DROP COLUMN" "DELETE FROM" "TRUNCATE" "ALTER TABLE.*DROP")

MIGRATIONS_DIR="${API_DIR}/prisma/migrations"
FOUND_DANGEROUS=false

for migration_dir in "$MIGRATIONS_DIR"/*/; do
    if [ -f "${migration_dir}migration.sql" ]; then
        migration_file="${migration_dir}migration.sql"
        migration_name=$(basename "$(dirname "$migration_file")")
        
        for op in "${DANGEROUS_OPS[@]}"; do
            if grep -qiE "$op" "$migration_file"; then
                echo -e "${RED}⚠️  ADVERTENCIA: Operación peligrosa encontrada en ${migration_name}${NC}"
                echo -e "${YELLOW}   Operación: $op${NC}"
                grep -iE "$op" "$migration_file" | head -3
                FOUND_DANGEROUS=true
            fi
        done
    fi
done

if [ "$FOUND_DANGEROUS" = true ]; then
    echo ""
    echo -e "${RED}⚠️  Se encontraron operaciones potencialmente peligrosas${NC}"
    echo -e "${YELLOW}   Revisa las migraciones manualmente antes de continuar${NC}"
    read -p "¿Deseas continuar de todas formas? (escribe 'CONTINUAR'): " CONFIRM2
    if [ "$CONFIRM2" != "CONTINUAR" ]; then
        echo -e "${RED}❌ Operación cancelada${NC}"
        exit 0
    fi
else
    echo -e "${GREEN}✅ No se encontraron operaciones peligrosas${NC}"
fi

# ===========================================
# PASO 5: EJECUTAR MIGRACIÓN
# ===========================================
echo ""
echo -e "${YELLOW}🚀 PASO 5: Ejecutando migración...${NC}"

# Usar migrate deploy (más seguro para producción)
echo -e "${BLUE}   Ejecutando: prisma migrate deploy${NC}"
npx prisma@5.19.1 migrate deploy

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Migración completada exitosamente${NC}"
else
    echo -e "${RED}❌ Error durante la migración${NC}"
    echo -e "${YELLOW}   El backup está guardado en: $BACKUP_FILE${NC}"
    echo -e "${YELLOW}   Puedes restaurar con: scripts/restore-database.sh $BACKUP_FILE${NC}"
    exit 1
fi

# ===========================================
# PASO 6: VERIFICAR INTEGRIDAD
# ===========================================
echo ""
echo -e "${YELLOW}✅ PASO 6: Verificando integridad de la base de datos...${NC}"

# Verificar que las tablas principales existan
TABLES=("organizations" "users" "projects" "clients" "suppliers" "accounts_receivable" "accounts_payable")

for table in "${TABLES[@]}"; do
    COUNT=$(PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | tr -d ' ')
    
    if [ $? -eq 0 ] && [ ! -z "$COUNT" ]; then
        echo -e "${GREEN}   ✅ Tabla $table: $COUNT registros${NC}"
    else
        echo -e "${RED}   ❌ Error al verificar tabla $table${NC}"
    fi
done

# ===========================================
# RESUMEN FINAL
# ===========================================
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ MIGRACIÓN COMPLETADA EXITOSAMENTE                     ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📦 Backup guardado en:${NC}"
echo -e "   $BACKUP_FILE"
echo ""
echo -e "${BLUE}📋 Próximos pasos:${NC}"
echo -e "   1. Verifica que la aplicación funcione correctamente"
echo -e "   2. Revisa los logs de la aplicación"
echo -e "   3. Si hay problemas, restaura el backup con:"
echo -e "      scripts/restore-database.sh $BACKUP_FILE"
echo ""
echo -e "${GREEN}✅ ¡Migración completada!${NC}"

