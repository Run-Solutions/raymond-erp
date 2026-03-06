#!/bin/bash

# Script completo de despliegue a producción
# Configura el servidor usando la variable de entorno DEPLOY_SERVER
# Ejemplo: DEPLOY_SERVER=root@example.com ./scripts/deploy-to-production.sh

set -e

SERVER="${DEPLOY_SERVER:-root@example.com}"
REMOTE_DIR="/root/raymond"

echo "🚀 RAYMOND ERP - Despliegue Completo a Producción"
echo "================================================"
echo "Servidor: ${SERVER}"
echo ""

# Paso 1: Exportar base de datos local
echo "📦 Paso 1/6: Exportando base de datos local..."
if [ ! -f "./scripts/export-local-db.sh" ]; then
    echo "❌ Error: No se encontró el script export-local-db.sh"
    exit 1
fi
./scripts/export-local-db.sh

# Buscar el archivo de backup más reciente (raymond_backup_* o raymond_production_export_*)
LATEST_BACKUP=$(ls -t backups/raymond_backup_*.sql.gz backups/raymond_production_export_*.sql.gz \
                   backups/raymond_backup_*.sql backups/raymond_production_export_*.sql \
                   docs/raymond_backup_*.sql.gz docs/raymond_production_export_*.sql.gz \
                   docs/raymond_backup_*.sql docs/raymond_production_export_*.sql 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "⚠️  No se encontró ningún backup"
    echo "   Buscando en: backups/ y docs/"
    echo "   Patrones: raymond_backup_* y raymond_production_export_*"
    echo "   Continuando sin restaurar BD..."
    SKIP_DB=true
else
    echo "✅ Backup encontrado: $LATEST_BACKUP"
    SKIP_DB=false
fi

# Paso 2: Subir archivos al servidor
echo ""
echo "📤 Paso 2/6: Subiendo archivos al servidor..."
./scripts/upload-to-server.sh

# Paso 3: Subir backup si existe
if [ "$SKIP_DB" = false ]; then
    echo ""
    echo "📤 Paso 3/6: Subiendo backup de base de datos..."
    ./scripts/upload-backup.sh "$LATEST_BACKUP"
fi

# Paso 4: Conectar y configurar
echo ""
echo "🔧 Paso 4/6: Configurando en el servidor..."
echo "   Conectando a ${SERVER}..."
echo ""

ssh ${SERVER} << 'ENDSSH'
cd /root/raymond

# Verificar que existe env.example
if [ ! -f "env.example" ]; then
    echo "❌ Error: No se encontró env.example"
    exit 1
fi

# Crear .env si no existe
if [ ! -f ".env" ]; then
    echo "📝 Creando archivo .env desde env.example..."
    cp env.example .env
    echo "⚠️  IMPORTANTE: Debes editar .env y configurar:"
    echo "   - DATABASE_URL"
    echo "   - JWT_SECRET"
    echo "   - JWT_REFRESH_SECRET"
    echo "   - CORS_ORIGIN"
    echo "   - NEXT_PUBLIC_API_URL"
    echo ""
    echo "Ejecuta: nano .env"
    exit 1
fi

echo "✅ Archivo .env existe"
ENDSSH

echo ""
echo "✅ Configuración del servidor completada"
echo ""
echo "📋 Próximos pasos manuales:"
echo ""
echo "1. Conecta al servidor:"
echo "   ssh ${SERVER}"
echo ""
echo "2. Configura las variables de entorno:"
echo "   cd ${REMOTE_DIR}"
echo "   nano .env"
echo ""
echo "   Variables requeridas:"
echo "   - DATABASE_URL=postgresql://raymond:TU_PASSWORD@postgres:5432/raymond_db"
echo "   - JWT_SECRET=(genera con: ./scripts/generate-secrets.sh)"
echo "   - JWT_REFRESH_SECRET=(genera con: ./scripts/generate-secrets.sh)"
echo "   - CORS_ORIGIN=http://YOUR_SERVER_IP:3001  # O https://YOUR_DOMAIN.com"
echo "   - NEXT_PUBLIC_API_URL=http://YOUR_SERVER_IP:3000/api  # O https://YOUR_DOMAIN.com/api"
echo ""
echo "3. Despliega:"
echo "   ./scripts/quick-deploy.sh"
echo ""
if [ "$SKIP_DB" = false ]; then
    BACKUP_NAME=$(basename "$LATEST_BACKUP")
    echo "4. Restaura la base de datos:"
    echo "   docker compose -f docker-compose.prod.yml exec postgres sh -c \\"
    echo "     'gunzip -c /backups/$BACKUP_NAME | psql -U \${POSTGRES_USER} -d \${POSTGRES_DB}'"
    echo ""
    echo "5. Ejecuta migraciones:"
    echo "   docker compose -f docker-compose.prod.yml run --rm api sh -c \\"
    echo "     'cd /app && ./node_modules/.bin/prisma migrate deploy --schema=./apps/api/prisma/schema.prisma'"
    echo ""
fi
echo "6. Verifica que todo funciona:"
echo "   docker compose -f docker-compose.prod.yml ps"
echo "   docker compose -f docker-compose.prod.yml logs -f"
echo ""
echo "🌐 URLs cuando esté listo:"
echo "   - API:  http://YOUR_SERVER_IP:3000/api"
echo "   - Web:  http://YOUR_SERVER_IP:3001"
echo "   - Docs: http://YOUR_SERVER_IP:3000/api/docs"
echo ""

