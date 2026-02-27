# RAYMOND ERP - Enterprise Resource Planning System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10-red)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)

> A comprehensive, multi-tenant ERP system built with modern technologies and enterprise-grade architecture.

## Features

## Taller R1 & R3 Sub-Locations Note
> **Note**: For Taller R1 and R3, "Sub-Ubicaciones" are auto-incrementally generated. Creating or editing a location with `maximo_stock = N` will automatically ensure sub-locations named `1` to `N` exist. Manual creation or deletion of sub-locations is disabled for these modules.

### Core Modules

- **Project Management**: Complete project lifecycle management with Kanban boards
- **Task Management**: Advanced task tracking with drag-and-drop, assignments, and comments
- **Sprint Management**: Agile sprint planning with burndown charts and velocity tracking
- **Finance Management**: Double-entry accounting system with financial reporting
- **Analytics & Dashboards**: Real-time KPIs, metrics, and business intelligence
- **Notifications**: Multi-channel notifications (Email, In-App) via BullMQ

### Enterprise Capabilities

- **Multi-Tenancy**: Complete organization-level data isolation
- **RBAC**: Role-Based Access Control with granular permissions
- **Audit Logging**: Comprehensive audit trails for compliance
- **Security**: JWT authentication, session management, password reset flows
- **API Documentation**: Auto-generated Swagger/OpenAPI documentation
- **Type Safety**: End-to-end TypeScript with shared types
- **Monorepo**: Turborepo-based architecture for optimal developer experience

## Architecture

```
raymond/
├── apps/
│   ├── api/          # NestJS Backend API
│   ├── web/          # Next.js Web Application
│   └── mobile/       # React Native Mobile App
└── packages/
    ├── types/        # Shared TypeScript types
    ├── ui/           # Shared UI components
    ├── hooks/        # Shared React hooks
    └── config/       # Shared configurations
```

## Tech Stack

### Backend
- **Framework**: NestJS 10
- **Database**: PostgreSQL with Prisma ORM
- **Cache/Queue**: Redis + BullMQ
- **Authentication**: JWT + Session-based
- **Validation**: class-validator + class-transformer
- **API Docs**: Swagger/OpenAPI

### Frontend
- **Web**: Next.js 14 (App Router)
- **Mobile**: React Native
- **State**: Zustand
- **UI**: TailwindCSS + shadcn/ui
- **Forms**: React Hook Form + Zod

### DevOps
- **Monorepo**: Turborepo
- **Package Manager**: pnpm
- **CI/CD**: GitHub Actions (ready)
- **Containerization**: Docker + Docker Compose

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+
- PostgreSQL 15+
- Redis 7+

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/raymond-erp.git
   cd raymond-erp
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp apps/api/.env.example apps/api/.env
   # Edit apps/api/.env with your configuration
   ```

4. **Start services with Docker**
   ```bash
   docker-compose up -d
   ```

5. **Run database migrations**
   ```bash
   cd apps/api
   pnpm prisma migrate dev
   pnpm prisma db seed
   ```

6. **Start development servers**
   ```bash
   pnpm dev
   ```

The API will be available at `http://localhost:3000` and the web app at `http://localhost:3001`.

### Default Credentials

After seeding, you can log in with:
- **Email**: `admin@raymond.com`
- **Password**: `Admin123!`

## API Documentation

Once the API is running, visit:
- **Swagger UI**: http://localhost:3000/api/docs
- **Health Check**: http://localhost:3000/health

## Project Structure

### Backend (`apps/api`)

```
src/
├── common/              # Shared utilities
│   ├── decorators/     # Custom decorators
│   ├── guards/         # Auth & permission guards
│   ├── middleware/     # Custom middleware
│   └── context/        # Request context
├── config/             # Configuration
├── database/           # Prisma client
└── modules/            # Feature modules
    ├── auth/          # Authentication
    ├── users/         # User management
    ├── roles/         # RBAC
    ├── projects/      # Projects
    ├── tasks/         # Tasks (Kanban)
    ├── sprints/       # Sprints
    ├── finance/       # Accounting
    │   ├── accounts/
    │   ├── journal-entries/
    │   └── reports/
    ├── analytics/     # KPIs & Dashboards
    └── notifications/ # Email & Push
```

## Key Features Explained

### Multi-Tenancy

All data is scoped to organizations. The `X-Organization-Id` header or JWT token contains the tenant context.

```typescript
// Automatic tenant isolation in guards
@UseGuards(TenantGuard)
@Get('projects')
async findAll(@Request() req) {
  // req.user.organizationId is automatically injected
}
```

### RBAC (Role-Based Access Control)

Granular permissions on resources and actions:

```typescript
@Permissions('projects:create')
@Post('projects')
async create() { }
```

### Double-Entry Accounting

Full double-entry bookkeeping system:

```typescript
POST /finance/journal-entries
{
  "description": "Client payment",
  "date": "2025-01-15",
  "lines": [
    { "debitAccountId": "cash-account", "creditAccountId": "revenue", "amount": 1000 }
  ]
}
```

### Financial Reports

- Trial Balance
- Income Statement
- Balance Sheet
- General Ledger
- Cashflow Statement

### Task Kanban

Drag-and-drop task management with position tracking:

```typescript
PATCH /tasks/:id/move
{
  "status": "IN_PROGRESS",
  "position": 3
}
```

### Sprint Burndown

Automatic burndown chart generation:

```
GET /sprints/:id/burndown
```

Returns ideal vs actual burndown data for visualization.

## Development

### Running Tests

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Test coverage
pnpm test:cov
```

### Building for Production

```bash
pnpm build
```

### Linting & Formatting

```bash
pnpm lint
pnpm format
```

## Deployment

### Docker Production Build

### Docker Production Build

```bash
docker build -t raymond-erp-api ./apps/api
docker run -p 3000:3000 raymond-erp-api
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Documentation

- [API Documentation](http://localhost:3000/api/docs)
- [Database Schema](./apps/api/prisma/schema.prisma)

## Roadmap

- [ ] Phase 6: Advanced Analytics with ML
- [ ] Phase 7: Mobile Apps (iOS/Android)
- [ ] Phase 8: Inventory Management
- [ ] Phase 9: HR & Payroll Module
- [ ] Phase 10: CRM Integration

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@raymond-erp.com or open an issue on GitHub.

---

Built with ❤️ by the RAYMOND Team
