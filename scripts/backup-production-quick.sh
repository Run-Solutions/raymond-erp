#!/bin/bash

# ===========================================
# BACKUP RÁPIDO DE PRODUCCIÓN (Versión Simplificada)
# ===========================================
# Versión más simple que pregunta por las credenciales interactivamente

set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKUP_DIR="${PROJECT_ROOT}/backups"

SSH_HOST="root@143.110.229.234"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/raymond_production_backup_${TIMESTAMP}.sql.gz"
BACKUP_FILE_REMOTE="/tmp/raymond_backup_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo -e "${BLUE}🗄️  BACKUP DE BASE DE DATOS DE PRODUCCIÓN${NC}"
echo "================================================"
echo ""

# Solicitar información de la base de datos
echo -e "${YELLOW}Por favor proporciona la siguiente información:${NC}"
read -p "Nombre de la base de datos [raymond_db]: " DB_NAME
DB_NAME=${DB_NAME:-raymond_db}

read -p "Usuario de PostgreSQL [raymond]: " DB_USER
DB_USER=${DB_USER:-raymond}

read -p "Host de PostgreSQL [localhost]: " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "Puerto de PostgreSQL [5432]: " DB_PORT
DB_PORT=${DB_PORT:-5432}

echo ""
read -sp "Contraseña de PostgreSQL: " DB_PASSWORD
echo ""

echo ""
echo -e "${BLUE}📦 Creando backup en el servidor...${NC}"

# Crear backup en el servidor
ssh "$SSH_HOST" bash <<EOF
    PGPASSWORD='$DB_PASSWORD' pg_dump \
        -h $DB_HOST \
        -p $DB_PORT \
        -U $DB_USER \
        -d $DB_NAME \
        --no-owner \
        --no-acl \
        | gzip > $BACKUP_FILE_REMOTE
    
    if [ \$? -eq 0 ]; then
        BACKUP_SIZE=\$(du -h $BACKUP_FILE_REMOTE | cut -f1)
        echo "✅ Backup creado: \$BACKUP_SIZE"
    else
        echo "❌ Error al crear backup"
        exit 1
    fi
EOF

# Descargar backup
echo -e "${BLUE}📥 Descargando backup...${NC}"
scp "$SSH_HOST:$BACKUP_FILE_REMOTE" "$BACKUP_FILE"

# Limpiar servidor
ssh "$SSH_HOST" "rm -f $BACKUP_FILE_REMOTE" 2>/dev/null || true

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo ""
echo -e "${GREEN}✅ Backup completado: $BACKUP_FILE ($BACKUP_SIZE)${NC}"

