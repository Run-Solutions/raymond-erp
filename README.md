# Raymond ERP

Raymond ERP es un sistema integral de gestión empresarial, modular, diseñado para controlar y dar trazabilidad a procesos de inventario, mantenimiento y talleres (Ej. **Taller R1**).

## 🚀 Tecnologías Principales

Este proyecto es un **monorepo** gestionado con [Turborepo](https://turbo.build/repo), e internamente se compone de:

*   **Frontend (Web App):** [Next.js](https://nextjs.org/) (App Router), React, Tailwind CSS, ShadCN UI.
*   **Backend (API Rest):** [NestJS](https://nestjs.org/), TypeScript.
*   **Base de Datos / ORM:** [Prisma](https://www.prisma.io/). PostgreSQL y/o MySQL.
*   **Gestor de Paquetes:** [pnpm](https://pnpm.io/) (v9+ recomendado).
*   **Despliegue:** [Docker](https://www.docker.com/) multi-stage.

## 📂 Estructura del Monorepo

```
raymond-erp/
├── apps/
│   ├── api/            # Backend en NestJS (APIs de Entradas, Salidas, Ubicaciones, etc.)
│   └── web/            # Frontend en Next.js (Interfaces, Dashboards, Listados de Taller R1)
├── packages/           # Librerías y códigos compartidos
│   ├── ui/             # Componentes compartidos y ShadCN UI
│   ├── types/          # Tipos e interfaces comunes
│   └── hooks/          # Custom hooks compartidos
├── docker-compose.yml  # Orquestador del ambiente completo (API + Web)
└── package.json        # Workspace y scripts de Turbo
```

### 🛠️ Backend - Estructura de APIs (Taller R1)
El modulo **Taller R1** está modelado con servicios propios dentro de la `api`:
- **Entradas (`entradas.service`)**: Registro de ingresos y sus checklists (inspección de equipo, fotos).
- **Salidas (`salidas.service`)**: Control de egresos, generación de remisiones (`R-XXXXX`) y cierre de folios.
- **Ubicaciones (`ubicaciones.service`)**: Maestro de ubicaciones geográficas y sub-ubicaciones.
- **Movilizaciones (`equipo-ubicacion.service`)**: Registro de rotación e históricos de un equipo o accesorio de punto A o punto B.
- **Mantenimiento (`evaluaciones.service`)**: Trazabilidad de diagnósticos y fallas de los equipos.

---

## 🏗️ Cómo empezar (Desarrollo Local)

Para desarrollar y ver reflejados los cambios sin contenedores:

1. Instalar dependencias desde la raíz usando `pnpm`:
   ```bash
   pnpm install
   ```
2. Configurar variables de entorno (`.env`) en `apps/api` y `apps/web` (URL de Base de datos, API\_URL, etc).
3. Levantar la base de datos (si la usas desde un docker).
4. Sincronizar Prisma:
   ```bash
   cd apps/api
   npx prisma generate
   ```
5. Levantar el ecosistema usando Turbo:
   ```bash
   # En la raíz del proyecto
   pnpm run dev
   ```

Esto iniciará el **Backend** (`localhost:8001`) y el **Frontend** (`localhost:8000`) simultáneamente, enrutados por los scripts definidos en cada `package.json`.

---

## 🐳 Despliegue con Docker

El proyecto está preparado para construirse en contenedores aislados que corren nativamente.

Hemos incluido un archivo `docker-compose.yml` en la raíz. Para levantar la aplicación completa, empaquetando backend y frontend:

1. Asegúrate de tener Docker y Docker Compose instalados en tu máquina.
2. Definir tus variables de entorno necesarias (al menos `DATABASE_URL` visible para el Compose).
3. Construir e iniciar contenedores:
   ```bash
   docker-compose up --build -d
   ```

Este comando:
- Construye la imagen `raymond-api` partiendo del workspace.
- Construye la imagen `raymond-web` pasándole en tiempo de compilación la URL de la API (`http://api:8001/api`).
- Levanta ambos servicios y los enlaza bajo la red virtual interna, respetando orquestación.

### Diagnósticos por Terminal
Para ver logs del entorno:
```bash
docker-compose logs -f
```
