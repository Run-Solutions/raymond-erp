#!/bin/bash

# ===========================================
# SCRIPT PARA BACKUP DE BASE DE DATOS DE PRODUCCIÓN
# ===========================================
# Conecta por SSH al servidor y crea backup de PostgreSQL

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKUP_DIR="${PROJECT_ROOT}/backups"

# Configuración del servidor
SSH_HOST="root@143.110.229.234"
SSH_PORT="${SSH_PORT:-22}"

# Configuración de la base de datos de producción
# Si está en Docker, el host puede ser 'postgres' o 'localhost'
DB_NAME="${DB_NAME:-raymond_db}"
DB_USER="${DB_USER:-raymond}"
DB_HOST="${DB_HOST:-postgres}"  # En Docker suele ser el nombre del servicio
DB_PORT="${DB_PORT:-5432}"

# Si prefieres usar las credenciales del archivo env.production
if [ -f "${PROJECT_ROOT}/env.production" ]; then
    source "${PROJECT_ROOT}/env.production"
    DB_NAME="${DB_NAME:-$DB_NAME}"
    DB_USER="${DB_USER:-$DB_USER}"
fi

# Crear directorio de backups
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/raymond_production_backup_${TIMESTAMP}.sql.gz"
BACKUP_FILE_REMOTE="/tmp/raymond_backup_${TIMESTAMP}.sql.gz"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   BACKUP DE BASE DE DATOS DE PRODUCCIÓN                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Verificar conexión SSH
echo -e "${YELLOW}🔌 Verificando conexión SSH...${NC}"
if ! ssh -o ConnectTimeout=10 -o BatchMode=yes "$SSH_HOST" "echo 'Conexión exitosa'" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  No se pudo conectar automáticamente (puede requerir contraseña)${NC}"
    echo -e "${BLUE}   Se solicitará contraseña SSH si es necesario${NC}"
fi

# Solicitar contraseña de la base de datos si no está en variable de entorno
if [ -z "$DB_PASSWORD" ]; then
    echo ""
    echo -e "${YELLOW}⚠️  No se encontró DB_PASSWORD en variables de entorno${NC}"
    echo -e "${BLUE}   Por favor ingresa la contraseña de PostgreSQL en el servidor:${NC}"
    read -s DB_PASSWORD
    echo ""
fi

echo ""
echo -e "${YELLOW}📦 Creando backup en el servidor remoto...${NC}"
echo -e "${BLUE}   Servidor: $SSH_HOST${NC}"
echo -e "${BLUE}   Base de datos: $DB_NAME${NC}"
echo ""

# Crear backup en el servidor remoto
ssh "$SSH_HOST" bash <<EOF
    set -e
    
    # Verificar que pg_dump esté disponible
    if ! command -v pg_dump &> /dev/null; then
        echo "❌ Error: pg_dump no está instalado en el servidor"
        exit 1
    fi
    
    # Crear backup
    echo "📦 Creando backup..."
    PGPASSWORD='$DB_PASSWORD' pg_dump \
        -h $DB_HOST \
        -p $DB_PORT \
        -U $DB_USER \
        -d $DB_NAME \
        --verbose \
        --no-owner \
        --no-acl \
        --clean \
        --if-exists \
        | gzip > $BACKUP_FILE_REMOTE
    
    if [ \$? -eq 0 ]; then
        # Obtener tamaño del archivo
        BACKUP_SIZE=\$(du -h $BACKUP_FILE_REMOTE | cut -f1)
        echo "✅ Backup creado exitosamente: $BACKUP_FILE_REMOTE (\$BACKUP_SIZE)"
        
        # Mostrar información del backup
        echo ""
        echo "📋 Información del backup:"
        ls -lh $BACKUP_FILE_REMOTE
    else
        echo "❌ Error al crear backup"
        exit 1
    fi
EOF

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error al crear backup en el servidor${NC}"
    exit 1
fi

# Descargar backup desde el servidor
echo ""
echo -e "${YELLOW}📥 Descargando backup desde el servidor...${NC}"
scp "$SSH_HOST:$BACKUP_FILE_REMOTE" "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✅ Backup descargado exitosamente${NC}"
    echo -e "${GREEN}   Archivo: $BACKUP_FILE${NC}"
    echo -e "${GREEN}   Tamaño: $BACKUP_SIZE${NC}"
else
    echo -e "${RED}❌ Error al descargar backup${NC}"
    exit 1
fi

# Limpiar archivo temporal en el servidor
echo ""
echo -e "${YELLOW}🧹 Limpiando archivo temporal en el servidor...${NC}"
ssh "$SSH_HOST" "rm -f $BACKUP_FILE_REMOTE" 2>/dev/null || true

# Verificar integridad del backup
echo ""
echo -e "${YELLOW}🔍 Verificando integridad del backup...${NC}"
if gunzip -t "$BACKUP_FILE" 2>/dev/null; then
    echo -e "${GREEN}✅ El backup está íntegro y no está corrupto${NC}"
else
    echo -e "${RED}❌ ADVERTENCIA: El backup puede estar corrupto${NC}"
    echo -e "${YELLOW}   Verifica el archivo manualmente${NC}"
fi

# Resumen final
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ BACKUP COMPLETADO EXITOSAMENTE                       ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📦 Backup guardado en:${NC}"
echo -e "   $BACKUP_FILE"
echo ""
echo -e "${BLUE}📋 Para restaurar este backup:${NC}"
echo -e "   gunzip $BACKUP_FILE"
echo -e "   psql -h [HOST] -U [USER] -d [DATABASE] < ${BACKUP_FILE%.gz}"
echo ""
echo -e "${BLUE}📋 O usar el script de restauración:${NC}"
echo -e "   ./scripts/restore-database.sh $BACKUP_FILE"
echo ""

