#!/bin/bash

# ===========================================
# Script para crear túnel SSH a Base de Datos de Producción
# ===========================================
# Este script crea un túnel SSH seguro para conectarse a la base de datos
# de producción sin exponer las credenciales directamente en la red pública.

set -e

# Configuración
SSH_HOST="${DEPLOY_SERVER:-root@example.com}"
LOCAL_PORT=5433
REMOTE_PORT=5432
TUNNEL_PID_FILE="/tmp/raymond-ssh-tunnel.pid"

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Función para verificar si el túnel ya está corriendo
check_tunnel() {
    if [ -f "$TUNNEL_PID_FILE" ]; then
        PID=$(cat "$TUNNEL_PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            return 0
        else
            rm -f "$TUNNEL_PID_FILE"
            return 1
        fi
    fi
    return 1
}

# Función para iniciar el túnel
start_tunnel() {
    if check_tunnel; then
        echo -e "${YELLOW}El túnel SSH ya está corriendo (PID: $(cat $TUNNEL_PID_FILE))${NC}"
        return 0
    fi

    echo -e "${GREEN}Iniciando túnel SSH...${NC}"
    echo "Conectando a $SSH_HOST"
    echo "Redirigiendo puerto local $LOCAL_PORT -> remoto $REMOTE_PORT"
    
    ssh -N -L ${LOCAL_PORT}:localhost:${REMOTE_PORT} ${SSH_HOST} &
    SSH_PID=$!
    echo $SSH_PID > "$TUNNEL_PID_FILE"
    
    sleep 2
    
    if check_tunnel; then
        echo -e "${GREEN}✓ Túnel SSH iniciado correctamente (PID: $SSH_PID)${NC}"
        echo ""
        echo "Ahora puedes conectarte usando:"
        echo "  Host: localhost"
        echo "  Puerto: $LOCAL_PORT"
        echo "  Base de datos: raymond_db"
        echo "  Usuario: raymond"
        echo ""
        echo "Para detener el túnel, ejecuta: $0 stop"
        echo "O mata el proceso: kill $SSH_PID"
    else
        echo -e "${RED}✗ Error al iniciar el túnel SSH${NC}"
        rm -f "$TUNNEL_PID_FILE"
        exit 1
    fi
}

# Función para detener el túnel
stop_tunnel() {
    if ! check_tunnel; then
        echo -e "${YELLOW}El túnel SSH no está corriendo${NC}"
        return 0
    fi

    PID=$(cat "$TUNNEL_PID_FILE")
    echo -e "${GREEN}Deteniendo túnel SSH (PID: $PID)...${NC}"
    kill $PID 2>/dev/null || true
    rm -f "$TUNNEL_PID_FILE"
    echo -e "${GREEN}✓ Túnel SSH detenido${NC}"
}

# Función para mostrar el estado
status_tunnel() {
    if check_tunnel; then
        PID=$(cat "$TUNNEL_PID_FILE")
        echo -e "${GREEN}✓ Túnel SSH está corriendo (PID: $PID)${NC}"
        echo "Puerto local: $LOCAL_PORT -> Remoto: $REMOTE_PORT"
    else
        echo -e "${RED}✗ Túnel SSH no está corriendo${NC}"
    fi
}

# Manejo de comandos
case "${1:-start}" in
    start)
        start_tunnel
        ;;
    stop)
        stop_tunnel
        ;;
    restart)
        stop_tunnel
        sleep 1
        start_tunnel
        ;;
    status)
        status_tunnel
        ;;
    *)
        echo "Uso: $0 {start|stop|restart|status}"
        echo ""
        echo "Comandos:"
        echo "  start   - Inicia el túnel SSH (por defecto)"
        echo "  stop    - Detiene el túnel SSH"
        echo "  restart - Reinicia el túnel SSH"
        echo "  status  - Muestra el estado del túnel"
        exit 1
        ;;
esac

