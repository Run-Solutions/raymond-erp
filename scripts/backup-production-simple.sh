#!/bin/bash

# ===========================================
# BACKUP SIMPLE DE PRODUCCIÓN
# ===========================================
# Versión más directa que usa las credenciales conocidas

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKUP_DIR="${PROJECT_ROOT}/backups"

SSH_HOST="root@143.110.229.234"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/raymond_production_backup_${TIMESTAMP}.sql.gz"
BACKUP_FILE_REMOTE="/tmp/raymond_backup_${TIMESTAMP}.sql.gz"

# Credenciales de producción (desde env.production)
DB_NAME="raymond_db"
DB_USER="raymond"
DB_PASSWORD="p4kT9e9QyuUFk4p1qgz1Nvy9GNR5shp"
DB_HOST="postgres"  # Nombre del servicio Docker
DB_PORT="5432"

mkdir -p "$BACKUP_DIR"

echo "🗄️  BACKUP DE BASE DE DATOS DE PRODUCCIÓN"
echo "================================================"
echo ""
echo "Servidor: $SSH_HOST"
echo "Base de datos: $DB_NAME"
echo ""

# Crear backup en el servidor
echo "📦 Creando backup en el servidor..."
ssh "$SSH_HOST" bash <<EOF
    # Verificar si está en Docker o instalación directa
    if docker ps | grep -q postgres; then
        echo "   Detectado PostgreSQL en Docker"
        # Backup desde contenedor Docker
        docker exec \$(docker ps -q -f name=postgres) pg_dump \
            -U $DB_USER \
            -d $DB_NAME \
            --no-owner \
            --no-acl \
            | gzip > $BACKUP_FILE_REMOTE
    else
        echo "   Detectado PostgreSQL instalación directa"
        # Backup directo
        PGPASSWORD='$DB_PASSWORD' pg_dump \
            -h $DB_HOST \
            -p $DB_PORT \
            -U $DB_USER \
            -d $DB_NAME \
            --no-owner \
            --no-acl \
            | gzip > $BACKUP_FILE_REMOTE
    fi
    
    if [ \$? -eq 0 ]; then
        BACKUP_SIZE=\$(du -h $BACKUP_FILE_REMOTE | cut -f1)
        echo "   ✅ Backup creado: \$BACKUP_SIZE"
    else
        echo "   ❌ Error al crear backup"
        exit 1
    fi
EOF

if [ $? -ne 0 ]; then
    echo "❌ Error al crear backup"
    exit 1
fi

# Descargar backup
echo ""
echo "📥 Descargando backup..."
scp "$SSH_HOST:$BACKUP_FILE_REMOTE" "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ Backup descargado: $BACKUP_SIZE"
else
    echo "❌ Error al descargar backup"
    exit 1
fi

# Limpiar servidor
echo ""
echo "🧹 Limpiando archivo temporal en el servidor..."
ssh "$SSH_HOST" "rm -f $BACKUP_FILE_REMOTE" 2>/dev/null || true

# Verificar integridad
echo ""
echo "🔍 Verificando integridad..."
if gunzip -t "$BACKUP_FILE" 2>/dev/null; then
    echo "✅ Backup íntegro y listo"
else
    echo "⚠️  Advertencia: Verifica el backup manualmente"
fi

echo ""
echo "✅ BACKUP COMPLETADO"
echo "   Archivo: $BACKUP_FILE"
echo "   Tamaño: $BACKUP_SIZE"
echo ""

