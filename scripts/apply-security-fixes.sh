#!/bin/bash

# Script para aplicar todas las correcciones de seguridad críticas
# Ejecutar en el servidor después de subir los archivos actualizados

set -e

echo "🔒 APLICANDO CORRECCIONES DE SEGURIDAD CRÍTICAS"
echo "================================================"
echo ""

# Detectar el archivo docker compose en uso
if [ -f "docker compose.prod.images.yml" ]; then
    COMPOSE_FILE="docker compose.prod.images.yml"
elif [ -f "docker-compose.prod.yml" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
elif [ -f "docker compose.registry.yml" ]; then
    COMPOSE_FILE="docker compose.registry.yml"
else
    COMPOSE_FILE="docker-compose.yml"
fi

echo "📝 Archivo detectado: $COMPOSE_FILE"
echo ""

# 1. Restringir PostgreSQL a localhost
echo "🔧 1/5: Restringiendo PostgreSQL a localhost..."
if grep -q 'ports:' "$COMPOSE_FILE" && grep -A 1 'postgres:' "$COMPOSE_FILE" | grep -q '5432:5432'; then
    sed -i.bak 's/- "${DB_PORT:-5432}:5432"/- "127.0.0.1:${DB_PORT:-5432}:5432"/' "$COMPOSE_FILE" 2>/dev/null || \
    sed -i.bak 's/- "5432:5432"/- "127.0.0.1:5432:5432"/' "$COMPOSE_FILE" 2>/dev/null || true
    
    if grep -q "127.0.0.1.*5432" "$COMPOSE_FILE"; then
        echo "   ✅ PostgreSQL restringido a localhost"
    else
        echo "   ⚠️  Revisa manualmente la configuración de PostgreSQL"
    fi
else
    echo "   ℹ️  PostgreSQL ya está configurado o no se encontró la configuración"
fi

# 2. Verificar que Redis está restringido
echo ""
echo "🔧 2/5: Verificando Redis..."
if grep -q "127.0.0.1.*6379" "$COMPOSE_FILE"; then
    echo "   ✅ Redis ya está restringido a localhost"
else
    echo "   ⚠️  Redis no está restringido - aplicando corrección..."
    sed -i.bak 's/- "${REDIS_PORT:-6379}:6379"/- "127.0.0.1:${REDIS_PORT:-6379}:6379"/' "$COMPOSE_FILE" 2>/dev/null || true
fi

# 3. Verificar variables de entorno
echo ""
echo "🔧 3/5: Verificando variables de entorno..."
if [ ! -f ".env" ]; then
    echo "   ⚠️  Archivo .env no encontrado"
    echo "   Crea .env desde env.example y configura:"
    echo "   - CORS_ORIGIN (requerido, sin wildcard)"
    echo "   - SUPER_ADMIN_EMAILS (opcional)"
    echo "   - ENABLE_SWAGGER=false (recomendado)"
else
    # Verificar CORS_ORIGIN
    if grep -q "^CORS_ORIGIN=" .env; then
        CORS_ORIGIN=$(grep "^CORS_ORIGIN=" .env | cut -d '=' -f2)
        if [ "$CORS_ORIGIN" = "*" ] || [ -z "$CORS_ORIGIN" ]; then
            echo "   ⚠️  CORS_ORIGIN está configurado como '*' o vacío"
            echo "   Actualiza .env con el dominio correcto:"
            echo "   CORS_ORIGIN=https://raymond.runsolutions-services.com"
        else
            echo "   ✅ CORS_ORIGIN configurado: $CORS_ORIGIN"
        fi
    else
        echo "   ⚠️  CORS_ORIGIN no está configurado en .env"
        echo "   Agrega: CORS_ORIGIN=https://raymond.runsolutions-services.com"
    fi
    
    # Verificar SUPER_ADMIN_EMAILS
    if ! grep -q "^SUPER_ADMIN_EMAILS=" .env; then
        echo "   ℹ️  SUPER_ADMIN_EMAILS no configurado (opcional)"
    else
        echo "   ✅ SUPER_ADMIN_EMAILS configurado"
    fi
fi

# 4. Reiniciar servicios
echo ""
echo "🔧 4/5: Reiniciando servicios..."
echo "   Deteniendo servicios..."
docker compose -f "$COMPOSE_FILE" stop postgres redis 2>/dev/null || true

echo "   Recreando contenedores con nueva configuración..."
docker compose -f "$COMPOSE_FILE" up -d postgres redis

echo ""
echo "⏳ Esperando que los servicios estén listos..."
sleep 5

# 5. Verificación final
echo ""
echo "🔧 5/5: Verificación final..."

# Verificar PostgreSQL
POSTGRES_CONTAINER=$(docker compose -f "$COMPOSE_FILE" ps -q postgres 2>/dev/null || echo "")
if [ -n "$POSTGRES_CONTAINER" ]; then
    POSTGRES_PORTS=$(docker port "$POSTGRES_CONTAINER" 2>/dev/null | grep 5432 || echo "")
    if echo "$POSTGRES_PORTS" | grep -q "127.0.0.1"; then
        echo "   ✅ PostgreSQL escucha solo en localhost"
    else
        echo "   ⚠️  PostgreSQL puede estar expuesto públicamente"
    fi
fi

# Verificar Redis
REDIS_CONTAINER=$(docker compose -f "$COMPOSE_FILE" ps -q redis 2>/dev/null || echo "")
if [ -n "$REDIS_CONTAINER" ]; then
    REDIS_PORTS=$(docker port "$REDIS_CONTAINER" 2>/dev/null | grep 6379 || echo "")
    if echo "$REDIS_PORTS" | grep -q "127.0.0.1"; then
        echo "   ✅ Redis escucha solo en localhost"
    else
        echo "   ⚠️  Redis puede estar expuesto públicamente"
    fi
fi

echo ""
echo "✅ CORRECCIONES DE SEGURIDAD APLICADAS"
echo ""
echo "📋 Verificaciones manuales recomendadas:"
echo ""
echo "1. Verifica que PostgreSQL no está expuesto:"
echo "   netstat -tlnp | grep 5432"
echo "   # Debe mostrar 127.0.0.1:5432, NO 0.0.0.0:5432"
echo ""
echo "2. Verifica que Redis no está expuesto:"
echo "   netstat -tlnp | grep 6379"
echo "   # Debe mostrar 127.0.0.1:6379, NO 0.0.0.0:6379"
echo ""
echo "3. Desde tu máquina local, intenta conectarte:"
echo "   telnet 143.110.229.234 5432  # Debe fallar"
echo "   telnet 143.110.229.234 6379  # Debe fallar"
echo ""
echo "4. Verifica que CORS_ORIGIN está configurado correctamente en .env"
echo ""
echo "5. Reinicia la API para aplicar cambios de código:"
echo "   docker compose -f $COMPOSE_FILE restart api"
echo ""
