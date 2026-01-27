#!/bin/bash
# ===========================================
# Script para crear y configurar el proyecto Raymond ERP
# ===========================================
# Ejecutar desde la raíz de raymond:
#   ./scripts/crear-proyecto-raymond.sh
# O desde scripts/:
#   ./crear-proyecto-raymond.sh
# ===========================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Raíz de raymond = carpeta padre de donde está este script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RAYMOND_ROOT="$(dirname "$SCRIPT_DIR")"
DEST_DIR="$(dirname "$RAYMOND_ROOT")/raymond"

if [ ! -f "$RAYMOND_ROOT/scripts/renombrar-proyecto.sh" ]; then
  echo -e "${RED}No se encontró scripts/renombrar-proyecto.sh en $RAYMOND_ROOT${NC}"
  exit 1
fi

echo -e "${BLUE}📁 Origen:  $RAYMOND_ROOT${NC}"
echo -e "${BLUE}📁 Destino: $DEST_DIR${NC}"
echo ""

if [ -d "$DEST_DIR" ]; then
  echo -e "${YELLOW}⚠️  Ya existe $DEST_DIR. ¿Sobrescribir? (s/N)${NC}"
  read -r R
  if [ "$R" != "s" ] && [ "$R" != "S" ]; then
    echo "Cancelado."
    exit 0
  fi
  echo -e "${YELLOW}Eliminando $DEST_DIR...${NC}"
  rm -rf "$DEST_DIR"
fi

echo -e "${BLUE}📦 Copiando proyecto (puede tardar unos segundos)...${NC}"
cp -r "$RAYMOND_ROOT" "$DEST_DIR"
echo -e "${GREEN}✓ Copia completada${NC}"
echo ""

echo -e "${BLUE}🔄 Aplicando renombrado raymond → raymond...${NC}"
cd "$DEST_DIR"
chmod +x scripts/renombrar-proyecto.sh
./scripts/renombrar-proyecto.sh "raymond" "Raymond"
echo ""
echo -e "${GREEN}✅ Proyecto Raymond creado en: $DEST_DIR${NC}"
echo ""
echo -e "${YELLOW}Próximos pasos:${NC}"
echo "  cd $DEST_DIR"
echo "  pnpm install"
echo "  cd apps/api && pnpm prisma migrate dev && pnpm prisma db seed"
echo "  pnpm dev"
echo ""
