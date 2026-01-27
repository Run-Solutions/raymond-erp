#!/bin/bash

# ===========================================
# Script para Renombrar el Proyecto RAYMOND
# ===========================================
# Uso: ./scripts/renombrar-proyecto.sh <nuevo-nombre> <nombre-display>
# Ejemplo: ./scripts/renombrar-proyecto.sh "mi-nuevo-proyecto" "Mi Nuevo Proyecto"
#
# Este script renombra todas las referencias a "raymond" en el proyecto
# ===========================================

set -e  # Salir si hay errores

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Verificar argumentos
if [ -z "$1" ] || [ -z "$2" ]; then
    echo -e "${RED}❌ Error: Faltan argumentos${NC}"
    echo ""
    echo "Uso: $0 <nuevo-nombre> <nombre-display>"
    echo ""
    echo "Ejemplos:"
    echo "  $0 \"mi-nuevo-proyecto\" \"Mi Nuevo Proyecto\""
    echo "  $0 \"alpha-erp\" \"Alpha ERP\""
    echo ""
    exit 1
fi

NUEVO_NOMBRE="$1"
NOMBRE_DISPLAY="$2"
NUEVO_NOMBRE_UPPER=$(echo "$NUEVO_NOMBRE" | tr '[:lower:]' '[:upper:]')
NUEVO_NOMBRE_DB="${NUEVO_NOMBRE//-/_}"  # Reemplazar guiones con guiones bajos para DB

# Validar que el nuevo nombre es válido
if [[ ! "$NUEVO_NOMBRE" =~ ^[a-z0-9-]+$ ]]; then
    echo -e "${RED}❌ Error: El nombre debe contener solo letras minúsculas, números y guiones${NC}"
    exit 1
fi

echo -e "${BLUE}🚀 Iniciando renombrado del proyecto...${NC}"
echo -e "${YELLOW}   Nombre técnico: ${NUEVO_NOMBRE}${NC}"
echo -e "${YELLOW}   Nombre display: ${NOMBRE_DISPLAY}${NC}"
echo ""

# Función para reemplazar en archivos
replace_in_file() {
    local file="$1"
    local search="$2"
    local replace="$3"
    
    if [ -f "$file" ]; then
        # Backup del archivo original
        cp "$file" "${file}.bak"
        
        # Reemplazar (compatible con macOS y Linux)
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|${search}|${replace}|g" "$file"
        else
            sed -i "s|${search}|${replace}|g" "$file"
        fi
        
        echo -e "${GREEN}✓${NC} Actualizado: $file"
    fi
}

# Función para generar JWT secret
generate_jwt_secret() {
    if command -v openssl &> /dev/null; then
        openssl rand -base64 32 | tr -d '\n'
    else
        # Fallback: usar /dev/urandom
        cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1
    fi
}

echo -e "${BLUE}📝 Paso 1: Actualizando package.json${NC}"
replace_in_file "package.json" "raymond-erp" "${NUEVO_NOMBRE}-erp"

echo ""
echo -e "${BLUE}📝 Paso 2: Actualizando variables de entorno${NC}"

# Actualizar env.example
if [ -f "env.example" ]; then
    replace_in_file "env.example" "raymond" "${NUEVO_NOMBRE_DB}"
    replace_in_file "env.example" "RAYMOND ERP" "${NOMBRE_DISPLAY}"
    replace_in_file "env.example" "raymond.runsolutions-services.com" "${NUEVO_NOMBRE}.runsolutions-services.com"
    
    # Generar nuevos JWT secrets
    NEW_JWT_SECRET=$(generate_jwt_secret)
    NEW_JWT_REFRESH_SECRET=$(generate_jwt_secret)
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|JWT_SECRET=.*|JWT_SECRET=${NEW_JWT_SECRET}|g" "env.example"
        sed -i '' "s|JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=${NEW_JWT_REFRESH_SECRET}|g" "env.example"
    else
        sed -i "s|JWT_SECRET=.*|JWT_SECRET=${NEW_JWT_SECRET}|g" "env.example"
        sed -i "s|JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=${NEW_JWT_REFRESH_SECRET}|g" "env.example"
    fi
    
    echo -e "${GREEN}✓${NC} Nuevos JWT secrets generados"
fi

# Actualizar .env si existe
if [ -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Archivo .env encontrado. Actualizando...${NC}"
    replace_in_file ".env" "raymond" "${NUEVO_NOMBRE_DB}"
    replace_in_file ".env" "raymond.runsolutions-services.com" "${NUEVO_NOMBRE}.runsolutions-services.com"
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|JWT_SECRET=.*|JWT_SECRET=${NEW_JWT_SECRET}|g" ".env"
        sed -i '' "s|JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=${NEW_JWT_REFRESH_SECRET}|g" ".env"
    else
        sed -i "s|JWT_SECRET=.*|JWT_SECRET=${NEW_JWT_SECRET}|g" ".env"
        sed -i "s|JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=${NEW_JWT_REFRESH_SECRET}|g" ".env"
    fi
fi

echo ""
echo -e "${BLUE}📝 Paso 3: Actualizando Docker Compose${NC}"

# Actualizar todos los archivos docker-compose
for compose_file in docker-compose*.yml; do
    if [ -f "$compose_file" ]; then
        replace_in_file "$compose_file" "raymond-postgres" "${NUEVO_NOMBRE}-postgres"
        replace_in_file "$compose_file" "raymond-redis" "${NUEVO_NOMBRE}-redis"
        replace_in_file "$compose_file" "raymond-api" "${NUEVO_NOMBRE}-api"
        replace_in_file "$compose_file" "raymond-web" "${NUEVO_NOMBRE}-web"
        replace_in_file "$compose_file" "raymond-api:latest" "${NUEVO_NOMBRE}-api:latest"
        replace_in_file "$compose_file" "raymond-web:latest" "${NUEVO_NOMBRE}-web:latest"
        replace_in_file "$compose_file" "raymond-network" "${NUEVO_NOMBRE}-network"
        replace_in_file "$compose_file" "raymond" "${NUEVO_NOMBRE_DB}"
    fi
done

echo ""
echo -e "${BLUE}📝 Paso 4: Actualizando scripts de deploy${NC}"

# Actualizar scripts que contengan referencias a raymond
for script in scripts/*.sh; do
    if [ -f "$script" ] && [ "$(basename "$script")" != "renombrar-proyecto.sh" ]; then
        # Solo actualizar si contiene "raymond"
        if grep -q "raymond" "$script" 2>/dev/null; then
            replace_in_file "$script" "raymond" "${NUEVO_NOMBRE}"
            # También actualizar referencias a rutas
            replace_in_file "$script" "/root/raymond" "/root/${NUEVO_NOMBRE}"
        fi
    fi
done

echo ""
echo -e "${BLUE}📝 Paso 5: Actualizando configuración Nginx${NC}"

if [ -d "nginx" ]; then
    for nginx_file in nginx/*.conf; do
        if [ -f "$nginx_file" ]; then
            # Renombrar archivo si contiene "raymond"
            if [[ "$nginx_file" == *"raymond"* ]]; then
                new_nginx_file=$(echo "$nginx_file" | sed "s/raymond/${NUEVO_NOMBRE}/g")
                mv "$nginx_file" "$new_nginx_file"
                nginx_file="$new_nginx_file"
                echo -e "${GREEN}✓${NC} Renombrado: $nginx_file"
            fi
            
            # Actualizar contenido
            replace_in_file "$nginx_file" "raymond.runsolutions-services.com" "${NUEVO_NOMBRE}.runsolutions-services.com"
            replace_in_file "$nginx_file" "raymond-access.log" "${NUEVO_NOMBRE}-access.log"
            replace_in_file "$nginx_file" "raymond-error.log" "${NUEVO_NOMBRE}-error.log"
        fi
    done
fi

echo ""
echo -e "${BLUE}📝 Paso 6: Actualizando Dockerfiles${NC}"

# Actualizar Dockerfiles si tienen referencias
for dockerfile in apps/*/Dockerfile; do
    if [ -f "$dockerfile" ]; then
        if grep -q "raymond" "$dockerfile" 2>/dev/null; then
            replace_in_file "$dockerfile" "raymond" "${NUEVO_NOMBRE}"
        fi
    fi
done

echo ""
echo -e "${BLUE}📝 Paso 7: Actualizando README${NC}"

if [ -f "README.md" ]; then
    replace_in_file "README.md" "RAYMOND ERP" "${NOMBRE_DISPLAY}"
    replace_in_file "README.md" "raymond-erp" "${NUEVO_NOMBRE}-erp"
fi

echo ""
echo -e "${GREEN}✅ Renombrado completado!${NC}"
echo ""
echo -e "${YELLOW}📋 Próximos pasos:${NC}"
echo ""
echo "1. Revisar los cambios:"
echo "   git diff  # Si usas git"
echo ""
echo "2. Actualizar variables de entorno manualmente:"
echo "   - Editar .env con tus valores específicos"
echo "   - Actualizar CORS_ORIGIN con tu dominio"
echo "   - Actualizar SUPER_ADMIN_EMAILS"
echo ""
echo "3. Limpiar y reinstalar dependencias:"
echo "   rm -rf node_modules apps/*/node_modules packages/*/node_modules"
echo "   pnpm install"
echo ""
echo "4. Configurar base de datos:"
echo "   cd apps/api"
echo "   pnpm prisma migrate dev"
echo "   pnpm prisma db seed"
echo ""
echo "5. Probar que todo funciona:"
echo "   docker-compose up -d"
echo "   pnpm dev"
echo ""
echo -e "${BLUE}💡 Tip: Los archivos originales tienen extensión .bak${NC}"
echo -e "${BLUE}   Puedes eliminarlos cuando confirmes que todo funciona:${NC}"
echo "   find . -name '*.bak' -delete"
echo ""

