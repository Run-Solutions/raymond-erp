# Dockerfile para la API (NestJS)
FROM node:20-alpine AS base

# Instalar pnpm
RUN npm install -g pnpm@9.15.4

# Instalar dependencias del sistema
RUN apk add --no-cache libc6-compat openssl curl

FROM base AS deps
WORKDIR /app

# Variables de entorno para mejorar la descarga de Prisma engines
ENV PRISMA_ENGINES_MIRROR=""
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Copiar archivos de configuración del monorepo
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages ./packages
COPY apps/api/package.json ./apps/api/
COPY packages/config/package.json ./packages/config/
COPY packages/types/package.json ./packages/types/

# Instalar dependencias con retry en caso de error de red
RUN pnpm install --frozen-lockfile --fetch-timeout=600000 || \
    (echo "⚠️ Primera instalación falló, reintentando..." && \
     sleep 5 && \
     pnpm install --frozen-lockfile --fetch-timeout=600000) || \
    (echo "⚠️ Segunda instalación falló, último intento..." && \
     sleep 10 && \
     pnpm install --frozen-lockfile --fetch-timeout=600000)

FROM base AS builder
WORKDIR /app

# Copiar archivos de configuración del monorepo (necesarios para el runner)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

# Copiar dependencias
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages ./packages

# Copiar código fuente
COPY apps/api ./apps/api
COPY packages ./packages
COPY turbo.json tsconfig.json ./

# Build de la aplicación
WORKDIR /app/apps/api
# Generar todos los clientes de Prisma antes del build (con retry para errores de red)
RUN (npx prisma@5.19.1 generate --schema=./prisma/schema.prisma && \
     npx prisma@5.19.1 generate --schema=./prisma/schemas/taller-r1.prisma && \
     npx prisma@5.19.1 generate --schema=./prisma/schemas/frontera.prisma && \
     npx prisma@5.19.1 generate --schema=./prisma/schemas/naves.prisma) || \
    (echo "⚠️ Prisma generate falló, reintentando..." && \
     sleep 5 && \
     npx prisma@5.19.1 generate --schema=./prisma/schema.prisma && \
     npx prisma@5.19.1 generate --schema=./prisma/schemas/taller-r1.prisma && \
     npx prisma@5.19.1 generate --schema=./prisma/schemas/frontera.prisma && \
     npx prisma@5.19.1 generate --schema=./prisma/schemas/naves.prisma)
RUN pnpm build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NODE_OPTIONS="--openssl-legacy-provider"

# Crear usuario no root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Copiar archivos necesarios para instalar dependencias
# Copiar estructura completa del monorepo para que pnpm funcione correctamente
COPY --from=builder --chown=nestjs:nodejs /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder --chown=nestjs:nodejs /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder --chown=nestjs:nodejs /app/packages ./packages

# Instalar solo dependencias de producción
# Usar --shamefully-hoist para crear estructura plana (similar a npm)
RUN pnpm install --prod --shamefully-hoist --fetch-timeout=600000

# Copiar archivos de la aplicación
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/prisma ./apps/api/prisma

# Instalar prisma CLI como dev dependency y regenerar Prisma Client
RUN pnpm add -D -w prisma@5.19.1 --fetch-timeout=600000

# Regenerar Prisma Clients desde el directorio raíz
RUN cd /app && \
    echo "Generating all Prisma Clients..." && \
    (npx prisma@5.19.1 generate --schema=./apps/api/prisma/schema.prisma && \
     npx prisma@5.19.1 generate --schema=./apps/api/prisma/schemas/taller-r1.prisma && \
     npx prisma@5.19.1 generate --schema=./apps/api/prisma/schemas/frontera.prisma && \
     npx prisma@5.19.1 generate --schema=./apps/api/prisma/schemas/naves.prisma) && \
    echo "✅ All Prisma Clients generated"

# Verificar que el cliente se generó y contiene ProjectStatus
RUN echo "📦 Verifying @prisma/client..." && \
    test -d ./node_modules/@prisma/client || (echo "❌ @prisma/client directory not found!" && exit 1) && \
    test -f ./node_modules/@prisma/client/index.js || (echo "❌ @prisma/client/index.js not found!" && exit 1) && \
    node -e "const pc = require('./node_modules/@prisma/client'); const ProjectStatus = pc.ProjectStatus || (pc.Prisma && pc.Prisma.ProjectStatus); if (!ProjectStatus || !ProjectStatus.PLANNING) { console.error('❌ ProjectStatus.PLANNING not found!'); console.log('Direct exports:', Object.keys(pc).filter(k => k.includes('Status') || k.includes('Project')).slice(0, 10)); if (pc.Prisma) console.log('Prisma namespace:', Object.keys(pc.Prisma).filter(k => k.includes('Status') || k.includes('Project')).slice(0, 10)); process.exit(1); } console.log('✅ ProjectStatus.PLANNING found:', ProjectStatus.PLANNING);" && \
    echo "✅ @prisma/client verified with ProjectStatus"

# Asegurar permisos correctos
RUN chown -R nestjs:nodejs ./node_modules/@prisma 2>/dev/null || true

# Asegurar que NODE_PATH incluya el directorio correcto
ENV NODE_PATH=/app/node_modules

USER nestjs

EXPOSE 8001

# Comando de inicio
CMD ["node", "dist/src/main.js"]

