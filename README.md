# Travel Operation

**SaaS platform for travel agencies, OTAs, visa agencies, B2B agents, corporate travel teams, ticketing companies, and multi-branch travel businesses.**

## Architecture

```
travel-operation/
├── apps/
│   ├── web/          # Next.js frontend (port 3901)
│   └── api/          # NestJS backend API (port 3900)
├── packages/
│   ├── database/     # Prisma schema & client
│   ├── config/       # Shared configurations
│   ├── types/        # Shared TypeScript types
│   ├── permissions/  # Permission definitions
│   └── validators/   # Shared validation schemas
├── docs/             # Architecture & module documentation
├── infra/            # Docker, Cloudflare, CI/CD configs
└── scripts/          # Utility scripts
```

## Tech Stack

- **Frontend**: Next.js, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: NestJS, TypeScript, REST API, Swagger/OpenAPI
- **Database**: PostgreSQL via Prisma ORM
- **Storage**: Cloudflare R2 (documents, assets, backups)
- **Infrastructure**: Cloudflare DNS, CDN, WAF, Pages

## Quick Start

### Prerequisites

- Node.js >= 20
- pnpm >= 9
- Docker & Docker Compose

### Setup

```bash
# 1. Clone the repository
git clone <repo-url> travel-operation
cd travel-operation

# 2. Install dependencies
pnpm install

# 3. Start local services (PostgreSQL, Redis, MinIO)
docker compose -f infra/docker/docker-compose.yml up -d

# 4. Set up environment
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 5. Generate Prisma client
pnpm db:generate

# 6. Run database migrations
pnpm db:migrate

# 7. Seed the database
pnpm db:seed

# 8. Start development servers
pnpm dev
```

The API will be available at http://localhost:3900 and the web app at http://localhost:3901.

### Local Development Accounts

The database seed (`pnpm db:seed`) creates demo accounts **for local development only**.
Their credentials are printed to the console at the end of a successful seed run.

- The seed refuses to run when `NODE_ENV=production` unless `ALLOW_PROD_SEED=true` is set.
- Set `SUPER_ADMIN_EMAIL` and a strong `SUPER_ADMIN_PASSWORD` in your environment to
  control the platform super-admin account instead of relying on the demo default.
- Never seed demo accounts into a production database.

## API Documentation

Swagger/OpenAPI documentation is available at `/api/v1/docs` when the API is running.

### Route Structure

| Prefix | Description |
|--------|-------------|
| `POST /api/v1/auth/login` | Public login |
| `GET /api/v1/auth/profile` | Current user profile |
| `GET/POST/PUT/DELETE /api/v1/platform/tenants` | Platform tenant management |
| `GET/POST/PUT/DELETE /api/v1/platform/users` | Platform user management |
| `GET /api/v1/platform/permissions` | Permission catalog |
| `GET/POST/PUT/DELETE /api/v1/tenant/branches` | Tenant branch management |
| `GET/POST/PUT/DELETE /api/v1/tenant/roles` | Tenant role management |
| `GET /api/v1/tenant/audit-logs` | Tenant audit log |
| `GET/POST/PUT/DELETE /api/v1/tenant/leads` | Lead pipeline management |
| `POST /api/v1/tenant/leads/:id/convert` | Convert lead to client |
| `GET/POST/PUT/DELETE /api/v1/tenant/clients` | Client management |
| `GET/POST/PUT/DELETE /api/v1/tenant/follow-ups` | Follow-up scheduling |
| `POST /api/v1/tenant/follow-ups/:id/complete` | Mark follow-up complete |
| `POST /api/v1/tenant/documents/upload-url` | Presigned R2 upload URL |
| `GET/POST/DELETE /api/v1/tenant/documents` | Document management |
| `GET /api/v1/tenant/documents/:id/download` | Presigned download URL |
| `GET /api/v1/tenant/settings` | Tenant settings |
| `GET /api/v1/tenant/dashboard/stats` | Dashboard statistics |

### Headers

- `Authorization: Bearer <jwt-token>` - Required for all authenticated routes
- `X-Tenant-Id: <tenant-id>` - Required for tenant-scoped routes
- `X-Branch-Id: <branch-id>` - Optional, for branch-scoped operations

## Database

### Key Principles

- Every tenant-owned table includes `tenantId`
- Branch-scoped tables include `branchId`
- Composite unique constraints use `@@unique([tenantId, field])` pattern
- Soft deletes via `deletedAt` timestamp
- All mutations are audit-logged

### Core Models

- **Tenant** - SaaS tenant with status tracking
- **Branch** - Multi-branch support per tenant
- **User** - Platform user with tenant memberships
- **Role/Permission** - RBAC with granular permission control
- **AuditLog** - Immutable audit trail for all mutations
- **Lead/Client** - CRM foundation
- **Quotation/Booking/Ticket** - Travel operations
- **Invoice/Receipt/Payment** - Financial records
- **Employee/Leave/Attendance** - HRM foundation

## Deployment

### Frontend (Cloudflare Pages)

```bash
cd apps/web
npx wrangler pages deploy .next
```

### Backend (Railway/Render/Fly.io)

1. Set environment variables from `apps/api/.env.example`
2. Run `pnpm --filter @travelo/database migrate:deploy`
3. Run `pnpm --filter @travelo/database seed`
4. Start with `pnpm --filter @travelo/api start:prod`

### Database (Neon PostgreSQL)

1. Create a Neon project
2. Copy the connection string
3. Set as `DATABASE_URL` in your API deployment

### Storage (Cloudflare R2)

1. Create R2 buckets: `travelo-documents`, `travelo-assets`
2. Generate R2 API tokens
3. Configure `R2_*` environment variables on the API

## Project Roadmap

### Milestone 1 - Foundation (Current)
- [x] Auth & user management
- [x] Tenant management
- [x] Branch management
- [x] RBAC with permissions
- [x] Tenant-aware API middleware
- [x] Audit logging
- [x] Settings foundation
- [x] Dashboard shell

### Milestone 2 - CRM (Current)
- [x] Leads pipeline
- [x] Client management
- [x] Follow-ups & activity timeline
- [x] Document management

### Milestone 3 - Travel Operations
- [ ] Quotation builder
- [ ] Booking / PNR management
- [ ] Payment collection
- [ ] Ticket issuance

### Milestone 4 - Finance
- [ ] Invoices & receipts
- [ ] Ledger management
- [ ] Expenses
- [ ] Vendor liability

### Milestone 5 - HRM
- [ ] Employee management
- [ ] Attendance & leave
- [ ] Performance & targets

### Milestone 6 - AI & Automation
- [ ] TTL alerts & reminders
- [ ] Auto assignment
- [ ] AI quotation drafts
- [ ] Knowledge Hub

## License

Private - All rights reserved.
