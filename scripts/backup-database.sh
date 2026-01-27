#!/bin/bash

# Script para hacer backup de la base de datos local

set -e

echo "🗄️  Iniciando backup de la base de datos..."

# Cargar variables desde .env si existe
if [ -f .env ]; then
    echo "📄 Cargando variables desde .env..."
    export $(grep -v '^#' .env | xargs)
fi

# Variables de configuración (ajusta según tu entorno local)
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-raymond}
DB_NAME=${DB_NAME:-raymond_db}
BACKUP_DIR=${BACKUP_DIR:-./backups}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/raymond_backup_${TIMESTAMP}.sql"

# Crear directorio de backups si no existe
mkdir -p "$BACKUP_DIR"

# Solicitar contraseña si no está en variable de entorno
if [ -z "$DB_PASSWORD" ]; then
    echo "⚠️  No se encontró DB_PASSWORD en variables de entorno"
    echo "Por favor ingresa la contraseña de la base de datos:"
    read -s DB_PASSWORD
fi

# Hacer backup
echo "📦 Creando backup en: $BACKUP_FILE"
PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -F p > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Backup creado exitosamente: $BACKUP_FILE"
    
    # Comprimir backup (opcional)
    echo "📦 Comprimiendo backup..."
    gzip "$BACKUP_FILE"
    echo "✅ Backup comprimido: ${BACKUP_FILE}.gz"
    
    echo ""
    echo "📋 Para restaurar en producción, ejecuta:"
    echo "   scripts/restore-database.sh ${BACKUP_FILE}.gz"
else
    echo "❌ Error al crear backup"
    exit 1
fi

