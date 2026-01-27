#!/bin/bash

# Script para build con retry automático en caso de errores de red
# Uso: ./scripts/build-with-retry.sh [max_attempts]

set -e

MAX_ATTEMPTS=${1:-3}
ATTEMPT=1

echo "🐳 RAYMOND ERP - Build con Retry Automático"
echo "=========================================="
echo "Intentos máximos: ${MAX_ATTEMPTS}"
echo ""

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔄 Intento ${ATTEMPT}/${MAX_ATTEMPTS}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    if docker-compose -f docker-compose.prod.yml build --no-cache; then
        echo ""
        echo "✅ Build completado exitosamente en el intento ${ATTEMPT}!"
        exit 0
    else
        if [ $ATTEMPT -lt $MAX_ATTEMPTS ]; then
            echo ""
            echo "⚠️  Build falló en el intento ${ATTEMPT}"
            echo "   Esperando 10 segundos antes del siguiente intento..."
            sleep 10
            ATTEMPT=$((ATTEMPT + 1))
        else
            echo ""
            echo "❌ Build falló después de ${MAX_ATTEMPTS} intentos"
            echo ""
            echo "💡 Sugerencias:"
            echo "   1. Verifica tu conexión a internet"
            echo "   2. Intenta más tarde (puede ser un problema temporal del servidor)"
            echo "   3. Usa build con cache: docker-compose -f docker-compose.prod.yml build"
            echo "   4. Verifica que Docker tenga suficiente espacio: docker system df"
            exit 1
        fi
    fi
done
