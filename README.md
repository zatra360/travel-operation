# ZATRA360 — Travel Operation Platform

**SaaS platform for travel agencies, OTAs, visa agencies, B2B agents, corporate travel teams, ticketing companies, and multi-branch travel businesses.**

## Status

- **Build**: Passing (TypeScript strict, NestJS + Next.js)
- **Tests**: 155/155 across 13 e2e suites
- **Security**: CSP/HSTS/Helmet, password complexity (upper+lower+digit), TOTP 2FA, rate limiting, tenant isolation
- **Phase 0 Stabilization**: Complete — all P0/P1 critical blockers resolved

## Architecture

```
travel-operation/
├── apps/
│   ├── web/          # Next.js 16 frontend (port 3901)
│   └── api/          # NestJS 11 backend (port 3900)
├── packages/
│   ├── database/     # Prisma schema (77 models) & client
│   ├── config/       # Shared configurations
│   ├── types/        # Shared TypeScript types
│   ├── permissions/  # 245 permissions across 49 modules
│   └── validators/   # Shared validation schemas
├── docs/             # Architecture, audit, research docs
├── infra/            # Docker, Cloudflare, CI/CD
└── scripts/          # Utility scripts
```

## Tech Stack

- **Frontend**: Next.js 16, TypeScript, Tailwind CSS 4, shadcn/ui, Recharts, Framer Motion
- **Backend**: NestJS 11, TypeScript, REST API, Swagger/OpenAPI, Passport JWT
- **Database**: PostgreSQL 16 via Prisma ORM (77 models)
- **Storage**: Cloudflare R2 (documents, assets)
- **Email**: Resend (transactional)
- **Search**: Meilisearch (leads + clients)

## Quick Start

```bash
git clone <repo-url> travel-operation && cd travel-operation
pnpm install
docker compose -f infra/docker/docker-compose.yml up -d
cp apps/api/.env.example apps/api/.env && cp apps/web/.env.example apps/web/.env
pnpm db:generate && pnpm db:migrate && pnpm db:seed
pnpm dev
```

API: http://localhost:3900 | Web: http://localhost:3901 | Swagger: http://localhost:3900/api/v1/docs

## Implemented Features

### Foundation
- Multi-tenant SaaS (Tenant, Branch, User, Role/Permission)
- 245 granular permissions across 49 modules
- JWT auth with refresh token rotation, login history, account lockout
- TOTP-based 2FA/MFA (enroll, verify, disable, login second factor)
- Password reset flow (forgot → email → reset)
- Tenant self-service subscription management (view/upgrade/cancel)
- Module toggle enforcement at API guard level
- Immutable audit logging on all mutations
- Hash-chained accounting audit ledger with verification

### CRM
- Leads pipeline with 100+ fields, scoring, source tracking, SLA
- Client profiles with lifetime value, activity scoring, VIP tracking
- Passport/visa management with verification
- Follow-up scheduling with notifications
- Duplicate detection (email, phone, passport)
- Lead-to-client conversion

### Sales & Operations
- Quotation builder with line items, revisions, e-sign, public sharing
- Quotation-to-booking conversion
- Booking/PNR management with passengers, segments, itinerary
- PNR duplicate detection, TTL tracking
- Ticket issuance with approval gate (PENDING → APPROVED → ISSUED)
- After-sales: Refunds, Reissues, Cancellations (approval workflows)
- Service catalog with configurable items and tax rates
- Contracts with e-sign

### Finance
- Invoices with auto-calculated tax (configurable rate)
- Payments with idempotency, auto-generated receipts
- Expenses with segregation of duties (SOD) approval
- Bank accounts & cash registers (balance locked, deposit/withdraw only)
- Multi-currency with configured exchange rates
- Full double-entry accounting: Chart of Accounts, GL, journals, fiscal periods
- Sub-ledger reconciliation (AR, AP, Bank)
- Financial risk alerts (8 fraud/anomaly detectors)
- Income Statement, Balance Sheet, Trial Balance, Cash Flow

### HRM
- Employees with departments, positions, branches
- Attendance with clock-in/out, SLA tracking
- Leave management with approvals
- Performance reviews, salary profiles, salary runs
- Commissions and incentives

### Additional
- Vendor/supplier management (airlines, hotels, GDS, transport)
- Insurance policy management
- Projects with Kanban tasks, dependencies, time tracking
- Support cases with channels, types, groups
- Customer feedback (NPS, ratings)
- Knowledge base hub
- Calendar with events and holidays
- Global search (leads + clients)
- Notifications: 12+ event triggers (booking, ticket, payment, expense, leave, commission, invoice, follow-up)
- In-app notification center with unread badge (sidebar + topbar)
- CSV export for 9 modules (GDPR data portability)
- CSV import for leads and clients

### Security & Compliance
- Helmet CSP/HSTS/Referrer-Policy/Frame-Ancestors
- Next.js security headers
- Request body size limit (10MB)
- Rate limiting on auth, import/export, password reset
- MIME type allowlist on document upload
- CSV injection prevention on exports
- Privacy Policy and Terms of Service pages
- Consent checkbox on registration

## API Overview

| Prefix | Description |
|--------|-------------|
| `POST /api/v1/auth/login` | Login (returns requires2FA if 2FA enabled) |
| `POST /api/v1/auth/login/2fa` | Second factor TOTP verification |
| `POST /api/v1/auth/register` | Register company + admin |
| `POST /api/v1/auth/forgot-password` | Request password reset email |
| `POST /api/v1/auth/reset-password` | Reset with token |
| `POST /api/v1/auth/2fa/enroll` | Start 2FA enrollment |
| `POST /api/v1/auth/2fa/verify-enroll` | Complete 2FA enrollment |
| `POST /api/v1/auth/2fa/disable` | Disable 2FA |
| `GET /api/v1/tenant/subscription` | View current plan + usage |
| `POST /api/v1/tenant/subscription/change` | Upgrade/downgrade plan |
| `POST /api/v1/tenant/subscription/cancel` | Cancel subscription |
| `GET /api/v1/tenant/*/export` | CSV export (leads, clients, bookings, invoices, payments, tickets, quotations, employees, expenses) |
| `GET /api/v1/tenant/activity/entity/:entity/:entityId` | Per-entity activity timeline |
| `GET /api/v1/tenant/notifications/count` | Unread notification count |

Headers: `Authorization: Bearer <jwt>` | `X-Tenant-Id` | `X-Branch-Id` (optional)

## Project Status

### Milestone 1 — Foundation ✅
- Auth, tenant, branch, RBAC, audit, settings, dashboard

### Milestone 2 — CRM ✅
- Leads, clients, follow-ups, documents, passports, visas

### Milestone 3 — Travel Operations ✅
- Quotations, bookings, PNR, tickets, after-sales (refund/reissue/cancellation)

### Milestone 4 — Finance ✅
- Invoices, receipts, payments, expenses, double-entry accounting, financial reports

### Milestone 5 — HRM ✅
- Employees, attendance, leave, performance, salary runs, commissions

### Milestone 6 — Advanced ✅ (partial)
- ✅ Vendors, insurance, projects, cases, feedback, knowledge, calendar, search, notifications, import/export
- ✅ 2FA/MFA, password reset, tenant self-service, module toggle enforcement
- ⚠️ TTL/deadline automation (cron needed)
- ⚠️ Product catalog, costing, supplier payables (Phase 1 roadmap)

## License

Private — All rights reserved.
