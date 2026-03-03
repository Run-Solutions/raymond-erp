# Dockerfile para la Web (Next.js)
FROM node:20-alpine AS base

# Instalar pnpm
RUN npm install -g pnpm@9.15.4

# Instalar dependencias del sistema
RUN apk add --no-cache libc6-compat openssl curl

FROM base AS deps
WORKDIR /app

# Variables de entorno para mejorar la descarga
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Copiar archivos de configuración del monorepo
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages ./packages
COPY apps/web/package.json ./apps/web/
COPY packages/config/package.json ./packages/config/
COPY packages/types/package.json ./packages/types/
COPY packages/ui/package.json ./packages/ui/
COPY packages/hooks/package.json ./packages/hooks/

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

# Copiar dependencias
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages ./packages

# Copiar código fuente y archivos de configuración de la raíz
# Necesario para turbo: package.json, pnpm-workspace.yaml, pnpm-lock.yaml
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web ./apps/web
COPY packages ./packages
COPY turbo.json tsconfig.json ./

# Build de la aplicación usando el script de build de Next.js
# Mantener WORKDIR en /app (raíz del monorepo) para que pnpm resuelva workspaces
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_TELEMETRY_DISABLED=1

# Construir Next.js desde el directorio de web
# Cambiar al directorio y ejecutar el build directamente
WORKDIR /app/apps/web

# Ejecutar el build de Next.js con las variables de entorno necesarias
RUN NEXT_PRIVATE_SKIP_TURBO=1 NODE_ENV=production pnpm exec next build || \
    (echo "❌ Error en build de Next.js" && \
     echo "Verificando estructura..." && \
     echo "PWD: $(pwd)" && \
     echo "Contenido actual:" && ls -la && \
     echo "Verificando node_modules:" && \
     test -d /app/node_modules && echo "✅ /app/node_modules existe" || echo "❌ /app/node_modules NO existe" && \
     test -d /app/apps/web/node_modules && echo "✅ /app/apps/web/node_modules existe" || echo "❌ /app/apps/web/node_modules NO existe" && \
     test -d node_modules && echo "✅ node_modules local existe" || echo "❌ node_modules local NO existe" && \
     echo "Verificando packages:" && \
     test -d /app/packages && echo "✅ /app/packages existe" || echo "❌ /app/packages NO existe" && \
     exit 1)

# Volver a la raíz
WORKDIR /app

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NODE_OPTIONS="--openssl-legacy-provider"

# Crear usuario no root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar archivos necesarios
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/package.json ./apps/web/

USER nextjs

EXPOSE 8000

ENV PORT=8000
ENV HOSTNAME="0.0.0.0"

# Comando de inicio
CMD ["node", "apps/web/server.js"]

