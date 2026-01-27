#!/bin/bash

# Script para configurar dominio raymond.runsolutions-services.com
# Uso: ./scripts/setup-domain.sh

set -e

DOMAIN="${DOMAIN:-raymond.example.com}"
SERVER_IP="${SERVER_IP:-YOUR_SERVER_IP}"

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🌐 Configuración de Dominio: ${DOMAIN}${NC}"
echo "============================================"
echo ""

# Verificar que estamos en el servidor
if [ ! -f "docker-compose.prod.images.yml" ]; then
    echo -e "${RED}❌ Error: Este script debe ejecutarse en el servidor${NC}"
    echo "   Conéctate al servidor: ssh root@${SERVER_IP}"
    echo "   Luego ejecuta: cd ~/raymond && ./scripts/setup-domain.sh"
    exit 1
fi

echo -e "${BLUE}📝 Paso 1: Actualizar archivo .env${NC}"
echo ""

# Actualizar .env si existe
if [ -f ".env" ]; then
    echo "   Actualizando CORS_ORIGIN y NEXT_PUBLIC_API_URL en .env..."
    sed -i "s|CORS_ORIGIN=.*|CORS_ORIGIN=https://${DOMAIN}|" .env
    sed -i "s|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=https://${DOMAIN}/api|" .env
    echo -e "${GREEN}✅ .env actualizado${NC}"
else
    echo -e "${YELLOW}⚠️  Archivo .env no encontrado. Créalo primero.${NC}"
fi

echo ""
echo -e "${BLUE}📦 Paso 2: Instalar Nginx${NC}"
echo ""

if ! command -v nginx &> /dev/null; then
    echo "   Instalando Nginx..."
    apt update
    apt install nginx -y
    echo -e "${GREEN}✅ Nginx instalado${NC}"
else
    echo -e "${GREEN}✅ Nginx ya está instalado${NC}"
fi

echo ""
echo -e "${BLUE}⚙️  Paso 3: Configurar Nginx (sin SSL inicialmente)${NC}"
echo ""

# Crear configuración de Nginx SIN SSL primero (certbot lo actualizará)
NGINX_CONFIG="/etc/nginx/sites-available/${DOMAIN}"

echo "   Creando configuración inicial de Nginx (HTTP solamente)..."
sudo tee "${NGINX_CONFIG}" > /dev/null << NGINX_EOF
# Configuración HTTP inicial (certbot agregará HTTPS después)
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};
    client_max_body_size 50M;

    location /api {
        proxy_pass http://localhost:3040;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location / {
        proxy_pass http://localhost:3041;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    access_log /var/log/nginx/raymond-access.log;
    error_log /var/log/nginx/raymond-error.log;
}
NGINX_EOF

# Habilitar sitio
echo "   Habilitando sitio..."
sudo ln -sf "${NGINX_CONFIG}" "/etc/nginx/sites-enabled/${DOMAIN}"

# Verificar configuración
echo "   Verificando configuración de Nginx..."
if sudo nginx -t; then
    echo -e "${GREEN}✅ Configuración de Nginx válida${NC}"
    sudo systemctl reload nginx
else
    echo -e "${RED}❌ Error en configuración de Nginx${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}🔒 Paso 4: Configurar SSL con Let's Encrypt${NC}"
echo ""

if ! command -v certbot &> /dev/null; then
    echo "   Instalando Certbot..."
    apt install certbot python3-certbot-nginx -y
    echo -e "${GREEN}✅ Certbot instalado${NC}"
else
    echo -e "${GREEN}✅ Certbot ya está instalado${NC}"
fi

echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE: Antes de continuar, asegúrate de que:${NC}"
echo "   1. El DNS esté configurado (raymond.runsolutions-services.com -> ${SERVER_IP})"
echo "   2. El DNS se haya propagado (puede tardar unos minutos)"
echo ""
read -p "¿El DNS ya está configurado y propagado? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠️  Configura el DNS primero y luego ejecuta:${NC}"
    echo "   sudo certbot --nginx -d ${DOMAIN}"
    exit 0
fi

echo ""
echo "   Obteniendo certificado SSL..."
echo "   (Certbot modificará automáticamente la configuración de Nginx para agregar HTTPS)"
sudo certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos --email admin@runsolutions-services.com --redirect || {
    echo -e "${YELLOW}⚠️  Certbot falló. Verifica que:${NC}"
    echo "   1. El DNS esté configurado: nslookup ${DOMAIN}"
    echo "   2. El DNS se haya propagado (puede tardar unos minutos)"
    echo "   3. El puerto 80 esté abierto en el firewall"
    echo ""
    echo "   Puedes intentar manualmente después:"
    echo "   sudo certbot --nginx -d ${DOMAIN}"
    exit 1
}

echo ""
echo -e "${BLUE}🔄 Paso 5: Reiniciar servicios${NC}"
echo ""

echo "   Reiniciando Nginx..."
sudo systemctl restart nginx
sudo systemctl status nginx --no-pager -l

echo ""
echo "   Reiniciando servicios Docker..."
docker-compose -f docker-compose.prod.images.yml restart api web

echo ""
echo -e "${GREEN}✅ Configuración completada!${NC}"
echo ""
echo -e "${BLUE}🌐 URLs:${NC}"
echo "   - Frontend: https://${DOMAIN}"
echo "   - API: https://${DOMAIN}/api"
echo "   - API Docs: https://${DOMAIN}/api/docs"
echo ""
echo -e "${BLUE}📋 Verificación:${NC}"
echo "   - Verificar servicios: docker-compose -f docker-compose.prod.images.yml ps"
echo "   - Ver logs Nginx: sudo tail -f /var/log/nginx/raymond-error.log"
echo "   - Ver logs API: docker-compose -f docker-compose.prod.images.yml logs api"
echo ""
