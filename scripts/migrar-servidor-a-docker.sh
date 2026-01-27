#!/bin/bash

# ╔════════════════════════════════════════════════════════════╗
# ║   MIGRACIÓN DE SERVIDOR A DOCKER-ONLY                     ║
# ║   Limpia código fuente y optimiza para solo imágenes      ║
# ╚════════════════════════════════════════════════════════════╝

set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuración
SERVER="${DEPLOY_SERVER:-root@143.110.229.234}"
REMOTE_DIR="/root/raymond"
BACKUP_DIR="/root/raymond-backup-$(date +%Y%m%d_%H%M%S)"

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   MIGRACIÓN A DEPLOY PROFESIONAL (DOCKER-ONLY)             ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📋 Este script:${NC}"
echo "   1. ✅ Hace backup del código fuente actual"
echo "   2. ✅ Limpia código fuente del servidor"
echo "   3. ✅ Mantiene solo imágenes Docker y configuración"
echo "   4. ✅ Optimiza estructura para deploys rápidos"
echo ""
echo -e "${YELLOW}⚠️  ADVERTENCIA: Esto moverá el código fuente a un backup${NC}"
echo ""

# Confirmación
read -p "¿Deseas continuar con la migración? (escribe 'SI'): " CONFIRM
if [ "$CONFIRM" != "SI" ]; then
    echo -e "${YELLOW}❌ Migración cancelada${NC}"
    exit 0
fi

# Verificar conexión SSH
echo -e "${BLUE}🔌 Verificando conexión SSH...${NC}"
if ! ssh -o ConnectTimeout=5 ${SERVER} "echo 'OK'" > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: No se pudo conectar al servidor${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Conexión SSH OK${NC}"
echo ""

# Ejecutar migración en servidor
echo -e "${BLUE}🔄 Ejecutando migración en servidor...${NC}"
echo ""

ssh ${SERVER} << ENDSSH
set -e

REMOTE_DIR="${REMOTE_DIR}"
BACKUP_DIR="${BACKUP_DIR}"

echo "📦 Paso 1/5: Creando backup del código fuente..."
mkdir -p "\${BACKUP_DIR}"

# Mover código fuente a backup (excluyendo lo esencial)
echo "   Moviendo código fuente..."
rsync -av \
    --exclude 'docker-images' \
    --exclude 'backups' \
    --exclude '.env' \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude 'dist' \
    "\${REMOTE_DIR}/" "\${BACKUP_DIR}/" || true

echo "   ✅ Backup creado en: \${BACKUP_DIR}"

echo ""
echo "🧹 Paso 2/5: Limpiando código fuente del servidor..."
cd "\${REMOTE_DIR}"

# Eliminar directorios de código fuente (mantener solo lo esencial)
DIRS_TO_REMOVE=(
    "apps"
    "packages"
    "prisma/migrations"  # Las migraciones se ejecutan desde la imagen
    "scripts"  # Solo mantener scripts de deploy
    ".git"
    "docs"
    "*.md"
)

# Crear lista de exclusiones para mantener
KEEP_DIRS=(
    "docker-images"
    "backups"
    ".env"
    "docker-compose.prod.images.yml"
    "scripts/deploy-on-server.sh"
    "scripts/backup-production-simple.sh"
)

echo "   Eliminando directorios de código fuente..."
for dir in "\${DIRS_TO_REMOVE[@]}"; do
    if [ -e "\${dir}" ]; then
        echo "   - Eliminando: \${dir}"
        rm -rf "\${dir}" || true
    fi
done

# Limpiar archivos de código fuente
echo "   Eliminando archivos de código fuente..."
find . -maxdepth 1 -type f \
    -name "*.ts" -o \
    -name "*.tsx" -o \
    -name "*.js" -o \
    -name "*.jsx" -o \
    -name "package.json" -o \
    -name "pnpm-lock.yaml" -o \
    -name "pnpm-workspace.yaml" -o \
    -name "tsconfig.json" -o \
    -name "turbo.json" \
    | grep -v "docker-compose" \
    | xargs rm -f 2>/dev/null || true

echo "   ✅ Código fuente limpiado"

echo ""
echo "📁 Paso 3/5: Creando estructura optimizada..."
mkdir -p "\${REMOTE_DIR}/docker-images"
mkdir -p "\${REMOTE_DIR}/backups"
mkdir -p "\${REMOTE_DIR}/scripts"

echo "   ✅ Estructura creada"

echo ""
echo "📋 Paso 4/5: Verificando archivos esenciales..."
ESSENTIAL_FILES=(
    "docker-compose.prod.images.yml"
    ".env"
)

MISSING_FILES=()
for file in "\${ESSENTIAL_FILES[@]}"; do
    if [ ! -f "\${file}" ]; then
        MISSING_FILES+=("\${file}")
    fi
done

if [ \${#MISSING_FILES[@]} -gt 0 ]; then
    echo "   ⚠️  Archivos faltantes:"
    for file in "\${MISSING_FILES[@]}"; do
        echo "      - \${file}"
    done
    echo "   ℹ️  Estos archivos deben crearse manualmente"
else
    echo "   ✅ Todos los archivos esenciales presentes"
fi

echo ""
echo "📊 Paso 5/5: Resumen de espacio liberado..."
BEFORE_SIZE=\$(du -sh "\${BACKUP_DIR}" 2>/dev/null | cut -f1 || echo "N/A")
AFTER_SIZE=\$(du -sh "\${REMOTE_DIR}" 2>/dev/null | cut -f1 || echo "N/A")

echo "   Tamaño del backup: \${BEFORE_SIZE}"
echo "   Tamaño actual del directorio: \${AFTER_SIZE}"

echo ""
echo "✅ Migración completada"
echo ""
echo "📝 Estructura actual:"
ls -lah "\${REMOTE_DIR}" | head -20

echo ""
echo "📦 Backup disponible en: \${BACKUP_DIR}"
echo "   Para restaurar: rsync -av \${BACKUP_DIR}/ \${REMOTE_DIR}/"
ENDSSH

echo ""
echo -e "${GREEN}✅ Migración completada exitosamente${NC}"
echo ""
echo -e "${BLUE}📋 Próximos pasos:${NC}"
echo "   1. Usar ./scripts/deploy-profesional.sh para futuros deploys"
echo "   2. El servidor ahora solo tiene imágenes Docker y configuración"
echo "   3. El código fuente está en backup por seguridad"
echo ""
echo -e "${YELLOW}💡 Para restaurar el código fuente (si es necesario):${NC}"
echo "   ssh ${SERVER}"
echo "   rsync -av ${BACKUP_DIR}/ ${REMOTE_DIR}/"
echo ""

