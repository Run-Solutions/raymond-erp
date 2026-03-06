.PHONY: help build up down restart logs clean backup restore generate-secrets

help: ## Mostrar ayuda
	@echo "Comandos disponibles:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

build: ## Construir las imágenes Docker
	docker compose -f docker-compose.prod.yml build

up: ## Levantar todos los servicios
	docker compose -f docker-compose.prod.yml up -d

down: ## Detener todos los servicios
	docker compose -f docker-compose.prod.yml down

restart: ## Reiniciar todos los servicios
	docker compose -f docker-compose.prod.yml restart

logs: ## Ver logs de todos los servicios
	docker compose -f docker-compose.prod.yml logs -f

logs-api: ## Ver logs de la API
	docker compose -f docker-compose.prod.yml logs -f api

logs-web: ## Ver logs de la Web
	docker compose -f docker-compose.prod.yml logs -f web

logs-db: ## Ver logs de la base de datos
	docker compose -f docker-compose.prod.yml logs -f postgres

ps: ## Ver estado de los servicios
	docker compose -f docker-compose.prod.yml ps

clean: ## Limpiar contenedores y volúmenes (¡CUIDADO!)
	docker compose -f docker-compose.prod.yml down -v
	docker system prune -f

backup: ## Crear backup de la base de datos
	@./scripts/backup-database.sh

backup-emergency: ## Extraer backup desde servidor remoto (emergencia)
	@./scripts/extract-backup-from-server.sh

restore: ## Restaurar base de datos (uso: make restore FILE=backups/archivo.sql.gz)
	@if [ -z "$(FILE)" ]; then \
		echo "Error: Especifica el archivo con FILE=backups/archivo.sql.gz"; \
		exit 1; \
	fi
	@./scripts/restore-database.sh $(FILE)

generate-secrets: ## Generar secrets seguros
	@./scripts/generate-secrets.sh

export-local-db: ## Exportar base de datos local
	@./scripts/export-local-db.sh

migrate: ## Ejecutar migraciones de Prisma
	docker compose -f docker-compose.prod.yml run --rm api sh -c "cd /app && ./node_modules/.bin/prisma migrate deploy --schema=./apps/api/prisma/schema.prisma"

shell-api: ## Abrir shell en el contenedor API
	docker compose -f docker-compose.prod.yml exec api sh

shell-db: ## Abrir shell en PostgreSQL
	docker compose -f docker-compose.prod.yml exec postgres psql -U raymond -d raymond_db

deploy: build up migrate ## Desplegar completo (build + up + migrate)
	@echo "✅ Despliegue completado!"
	@echo "Verifica el estado con: make ps"
	@echo "Ver logs con: make logs"

build-push: ## Build y push de imágenes a registry (uso: make build-push REGISTRY=docker.io/usuario)
	@./scripts/build-and-push-images.sh $(REGISTRY) $(VERSION)

deploy-registry: ## Desplegar desde registry (uso: make deploy-registry REGISTRY=docker.io/usuario VERSION=v3.0.3)
	@./scripts/deploy-from-registry.sh $(REGISTRY) $(VERSION)

build-send-ssh: ## Build local y envío por SSH (uso: make build-send-ssh SERVER=root@143.110.229.234)
	@./scripts/build-and-send-via-ssh.sh $(SERVER)

