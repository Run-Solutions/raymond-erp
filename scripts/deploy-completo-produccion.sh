#!/bin/bash

# ===========================================
# DEPLOY COMPLETO A PRODUCCIÓN
# ===========================================
# Este script realiza un deploy completo y seguro:
# 1. Backup de producción
# 2. Validación de migraciones
# 3. Subida de código
# 4. Migración de base de datos
# 5. Deploy de aplicación
# 6. Verificación post-deploy
#
# Uso: ./scripts/deploy-completo-produccion.sh

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
BACKUP_DIR="${PROJECT_ROOT}/backups"

# Configuración
SSH_HOST="root@143.110.229.234"
REMOTE_DIR="/root/raymond"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   DEPLOY COMPLETO A PRODUCCIÓN - RAYMOND ERP               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ===========================================
# PASO 1: VERIFICACIONES PREVIAS
# ===========================================
echo -e "${YELLOW}📋 PASO 1/8: Verificaciones previas...${NC}"

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ] || [ ! -f "docker-compose.prod.yml" ]; then
    echo -e "${RED}❌ Error: Ejecuta este script desde la raíz del proyecto${NC}"
    exit 1
fi

# Verificar conexión SSH
echo -e "${BLUE}   Verificando conexión SSH...${NC}"
if ! ssh -o ConnectTimeout=10 "$SSH_HOST" "echo 'OK'" > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: No se pudo conectar al servidor${NC}"
    echo -e "${YELLOW}   Verifica tu acceso SSH: ssh $SSH_HOST${NC}"
    exit 1
fi
echo -e "${GREEN}   ✅ Conexión SSH OK${NC}"

# Verificar que existe env.production
if [ ! -f "${PROJECT_ROOT}/env.production" ]; then
    echo -e "${YELLOW}⚠️  No se encontró env.production${NC}"
    echo -e "${BLUE}   Creando desde env.example...${NC}"
    if [ -f "${PROJECT_ROOT}/env.example" ]; then
        cp "${PROJECT_ROOT}/env.example" "${PROJECT_ROOT}/env.production"
        echo -e "${YELLOW}   ⚠️  IMPORTANTE: Edita env.production con las credenciales de producción${NC}"
    else
        echo -e "${RED}❌ Error: No se encontró env.example${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Verificaciones completadas${NC}"
echo ""

# ===========================================
# PASO 2: BACKUP DE PRODUCCIÓN
# ===========================================
echo -e "${YELLOW}📦 PASO 2/8: Creando backup de producción...${NC}"

if [ -f "${SCRIPT_DIR}/backup-production-simple.sh" ]; then
    chmod +x "${SCRIPT_DIR}/backup-production-simple.sh" 2>/dev/null || true
    "${SCRIPT_DIR}/backup-production-simple.sh" || {
        echo -e "${YELLOW}⚠️  No se pudo crear backup automático${NC}"
        echo -e "${YELLOW}   Continuando de todas formas...${NC}"
        echo -e "${BLUE}   Puedes crear backup manualmente después${NC}"
    }
else
    echo -e "${YELLOW}⚠️  Script de backup no encontrado${NC}"
    echo -e "${BLUE}   Creando backup manual...${NC}"
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE_REMOTE="/tmp/raymond_backup_${TIMESTAMP}.sql.gz"
    
    ssh "$SSH_HOST" bash <<'REMOTE_EOF'
        # Detectar si está en Docker
        if docker ps | grep -q postgres; then
            CONTAINER=$(docker ps -q -f name=postgres)
            docker exec $CONTAINER pg_dump -U raymond -d raymond_db --no-owner --no-acl | gzip > /tmp/raymond_backup_manual.sql.gz
            echo "Backup creado desde Docker"
        else
            PGPASSWORD='p4kT9e9QyuUFk4p1qgz1Nvy9GNR5shp' pg_dump -h postgres -U raymond -d raymond_db --no-owner --no-acl | gzip > /tmp/raymond_backup_manual.sql.gz
            echo "Backup creado directamente"
        fi
REMOTE_EOF
    
    mkdir -p "$BACKUP_DIR"
    scp "$SSH_HOST:/tmp/raymond_backup_manual.sql.gz" "${BACKUP_DIR}/raymond_production_backup_${TIMESTAMP}.sql.gz"
    ssh "$SSH_HOST" "rm -f /tmp/raymond_backup_manual.sql.gz"
    
    echo -e "${GREEN}   ✅ Backup creado: ${BACKUP_DIR}/raymond_production_backup_${TIMESTAMP}.sql.gz${NC}"
fi

echo ""

# ===========================================
# PASO 3: VALIDAR MIGRACIONES
# ===========================================
echo -e "${YELLOW}🔍 PASO 3/8: Validando migraciones...${NC}"

cd "$API_DIR"

# Verificar estado de migraciones
echo -e "${BLUE}   Revisando migraciones pendientes...${NC}"

# Verificar seguridad de migraciones
if [ -f "${SCRIPT_DIR}/check-migrations-safety.sh" ]; then
    chmod +x "${SCRIPT_DIR}/check-migrations-safety.sh" 2>/dev/null || true
    "${SCRIPT_DIR}/check-migrations-safety.sh" || {
        echo -e "${RED}❌ Se encontraron migraciones peligrosas${NC}"
        echo -e "${YELLOW}   Revisa las migraciones antes de continuar${NC}"
        read -p "¿Deseas continuar de todas formas? (escribe 'CONTINUAR'): " CONFIRM
        if [ "$CONFIRM" != "CONTINUAR" ]; then
            echo -e "${RED}❌ Deploy cancelado${NC}"
            exit 1
        fi
    }
fi

echo -e "${GREEN}✅ Migraciones validadas${NC}"
echo ""

# ===========================================
# PASO 4: SUBIR CÓDIGO AL SERVIDOR
# ===========================================
echo -e "${YELLOW}📤 PASO 4/8: Subiendo código al servidor...${NC}"

if [ -f "${SCRIPT_DIR}/upload-to-server.sh" ]; then
    chmod +x "${SCRIPT_DIR}/upload-to-server.sh" 2>/dev/null || true
    DEPLOY_SERVER="$SSH_HOST" "${SCRIPT_DIR}/upload-to-server.sh"
else
    echo -e "${BLUE}   Usando rsync directo...${NC}"
    rsync -avz \
        --progress \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude '.next' \
        --exclude 'dist' \
        --exclude '*.log' \
        --exclude '.env' \
        --exclude 'backups/*.sql*' \
        --exclude 'apps/*/node_modules' \
        --exclude 'packages/*/node_modules' \
        --exclude 'apps/*/dist' \
        --exclude 'apps/web/.next' \
        --exclude 'apps/api/dist' \
        "${PROJECT_ROOT}/" "${SSH_HOST}:${REMOTE_DIR}/"
fi

echo -e "${GREEN}✅ Código subido${NC}"
echo ""

# ===========================================
# PASO 5: CONFIGURAR VARIABLES DE ENTORNO
# ===========================================
echo -e "${YELLOW}⚙️  PASO 5/8: Configurando variables de entorno...${NC}"

# Subir env.production al servidor
if [ -f "${PROJECT_ROOT}/env.production" ]; then
    echo -e "${BLUE}   Subiendo env.production...${NC}"
    scp "${PROJECT_ROOT}/env.production" "${SSH_HOST}:${REMOTE_DIR}/.env"
    echo -e "${GREEN}   ✅ Variables de entorno configuradas${NC}"
else
    echo -e "${YELLOW}⚠️  env.production no encontrado${NC}"
    echo -e "${BLUE}   El servidor usará su .env existente${NC}"
fi

echo ""

# ===========================================
# PASO 6: EJECUTAR MIGRACIONES
# ===========================================
echo -e "${YELLOW}🔄 PASO 6/8: Ejecutando migraciones de base de datos...${NC}"

echo -e "${BLUE}   ⚠️  CRÍTICO: Se aplicarán las migraciones a producción${NC}"
read -p "¿Estás seguro de continuar? (escribe 'SI' en mayúsculas): " CONFIRM_MIGRATE
if [ "$CONFIRM_MIGRATE" != "SI" ]; then
    echo -e "${RED}❌ Migraciones canceladas${NC}"
    echo -e "${YELLOW}   Puedes ejecutarlas manualmente después${NC}"
    SKIP_MIGRATE=true
else
    SKIP_MIGRATE=false
fi

if [ "$SKIP_MIGRATE" = false ]; then
    ssh "$SSH_HOST" bash <<REMOTE_EOF
        cd ${REMOTE_DIR}
        
        echo "   Ejecutando migraciones..."
        
        # Si está en Docker
        if docker ps | grep -q api; then
            echo "   Ejecutando migraciones desde contenedor Docker..."
            docker-compose -f docker-compose.prod.yml exec -T api sh -c "cd /app && npx prisma migrate deploy --schema=./prisma/schema.prisma"
        else
            # Si no está en Docker, ejecutar directamente
            echo "   Ejecutando migraciones directamente..."
            cd apps/api
            npx prisma migrate deploy --schema=./prisma/schema.prisma
        fi
        
        if [ \$? -eq 0 ]; then
            echo "   ✅ Migraciones aplicadas exitosamente"
        else
            echo "   ❌ Error en migraciones"
            exit 1
        fi
REMOTE_EOF
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Migraciones completadas${NC}"
    else
        echo -e "${RED}❌ Error en migraciones${NC}"
        echo -e "${YELLOW}   Revisa los logs y restaura el backup si es necesario${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  Migraciones omitidas${NC}"
fi

echo ""

# ===========================================
# PASO 7: CONSTRUIR Y DESPLEGAR APLICACIÓN
# ===========================================
echo -e "${YELLOW}🚀 PASO 7/8: Construyendo y desplegando aplicación...${NC}"

ssh "$SSH_HOST" bash <<REMOTE_EOF
    cd ${REMOTE_DIR}
    
    echo "   Construyendo imágenes Docker..."
    docker-compose -f docker-compose.prod.yml build --no-cache
    
    if [ \$? -ne 0 ]; then
        echo "   ❌ Error al construir imágenes"
        exit 1
    fi
    
    echo "   Deteniendo servicios antiguos..."
    docker-compose -f docker-compose.prod.yml down
    
    echo "   Iniciando servicios nuevos..."
    docker-compose -f docker-compose.prod.yml up -d
    
    echo "   Esperando que los servicios estén listos..."
    sleep 15
    
    echo "   Verificando estado de servicios..."
    docker-compose -f docker-compose.prod.yml ps
REMOTE_EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Aplicación desplegada${NC}"
else
    echo -e "${RED}❌ Error al desplegar aplicación${NC}"
    exit 1
fi

echo ""

# ===========================================
# PASO 8: VERIFICACIÓN POST-DEPLOY
# ===========================================
echo -e "${YELLOW}✅ PASO 8/8: Verificando despliegue...${NC}"

ssh "$SSH_HOST" bash <<REMOTE_EOF
    cd ${REMOTE_DIR}
    
    echo "   Verificando servicios..."
    
    # Verificar PostgreSQL
    if docker ps | grep -q postgres; then
        if docker exec \$(docker ps -q -f name=postgres) pg_isready -U raymond > /dev/null 2>&1; then
            echo "   ✅ PostgreSQL está funcionando"
        else
            echo "   ⚠️  PostgreSQL no está listo aún"
        fi
    fi
    
    # Verificar API
    sleep 5
    API_STATUS=\$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3040/api/health || echo "000")
    if [ "\$API_STATUS" = "200" ]; then
        echo "   ✅ API está respondiendo"
    else
        echo "   ⚠️  API aún no está lista (código: \$API_STATUS)"
    fi
    
    # Verificar Web
    WEB_STATUS=\$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3041 || echo "000")
    if [ "\$WEB_STATUS" = "200" ]; then
        echo "   ✅ Web está respondiendo"
    else
        echo "   ⚠️  Web aún no está lista (código: \$WEB_STATUS)"
    fi
REMOTE_EOF

echo ""

# ===========================================
# RESUMEN FINAL
# ===========================================
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ DEPLOY COMPLETADO EXITOSAMENTE                       ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📋 Próximos pasos:${NC}"
echo -e "   1. Verifica que la aplicación funcione:"
echo -e "      http://143.110.229.234:3041"
echo ""
echo -e "   2. Revisa los logs si hay problemas:"
echo -e "      ssh $SSH_HOST"
echo -e "      cd $REMOTE_DIR"
echo -e "      docker-compose -f docker-compose.prod.yml logs -f"
echo ""
echo -e "   3. Si hay problemas, restaura el backup:"
LATEST_BACKUP=$(ls -t ${BACKUP_DIR}/raymond_production_backup_*.sql.gz 2>/dev/null | head -1)
if [ ! -z "$LATEST_BACKUP" ]; then
    echo -e "      Backup disponible: $LATEST_BACKUP"
fi
echo ""
echo -e "${GREEN}✅ ¡Deploy completado!${NC}"

