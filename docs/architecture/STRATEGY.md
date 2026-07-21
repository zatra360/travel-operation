# Travel Operation — Permanent Strategy

**Version:** 3.0.0
**Created:** 2026-07-13
**Updated:** 2026-07-14 (M7-M10 delivered, 81 models, 53 API modules, 67 UI pages)
**Audience:** All agents (human and AI) working on this codebase.
**Rule:** Read `PROJECT_CONTEXT.md` first, then this document, then work. This document is permanent and evolves with the project.

## PERMANENT VERIFICATION RULE

**Every change — before declaring done — must pass ALL:**
- `pnpm --filter @travelo/api exec tsc -p tsconfig.build.json --noEmit` — API typecheck (0 errors)
- `pnpm --filter @travelo/web exec tsc --noEmit` — Web typecheck (0 errors)
- `pnpm --filter @travelo/api exec jest -- --testPathIgnorePatterns="e2e|test/"` — Tests (0 failures)

If any fail, fix before continuing. Never skip. Never push broken code.

---

## 1. PROJECT IDENTITY

**Travel Operation** is a production-grade, SaaS-first operating system for travel agencies, OTAs, visa agencies, B2B agents, ticketing companies, corporate travel teams, and multi-branch travel businesses.

| Property | Value |
|---|---|
| Architecture | Modular monolith (NestJS API + Next.js frontend) |
| Package manager | **pnpm ONLY** (never npm/yarn) |
| Database | PostgreSQL (Neon in prod), Prisma ORM |
| Storage | Cloudflare R2 (private, signed URLs) |
| Auth | JWT access tokens, bcrypt, RBAC with module×action permissions |
| Tenancy | Multi-tenant via `tenantId` on every business table |
| Branding | Platform = "Travel Operation", brand = "Zatra 360" |
| Domain | zatra360.com (Cloudflare Pages) |

---

## 2. REPOSITORY LAYOUT

```
travel-operation/
├── apps/
│   ├── web/              Next.js App Router, port 3901
│   └── api/              NestJS, port 3900, prefix /api/v1
├── packages/
│   ├── database/         Prisma schema + client + seed
│   ├── config/           Shared tsconfig presets
│   ├── types/            Shared TypeScript interfaces
│   ├── permissions/      Module × Action catalog (155 permissions)
│   └── validators/       Shared regex validators
├── docs/
│   ├── architecture/     Rule docs (source of truth)
│   ├── modules/          Per-module documentation
│   ├── deployment/       Production guides
│   ├── database/         Schema reference
│   ├── api/              API docs (Swagger preferred)
│   └── security/         Security overview
├── infra/
│   ├── docker/           Docker Compose (PG, Redis, MinIO, RabbitMQ, Meilisearch)
│   ├── cloudflare/       Wrangler config, R2 setup
│   └── github-actions/   CI pipeline
└── scripts/              Setup scripts
```

---

## 3. NON-NEGOTIABLE PRINCIPLES

These apply to ALL changes. No exceptions.

### 3.1 Tenant Safety
- Every tenant-owned business table carries `tenantId`
- All queries filter by `tenantId` — cross-tenant leakage = critical bug
- Branch-aware records also carry `branchId`
- Business identifiers are tenant-scoped: `@@unique([tenantId, field])`
- Never global-unique business numbers

### 3.2 RBAC Enforcement
- Guards run: `JwtAuthGuard` → `TenantGuard` → `PermissionsGuard`
- `@RequirePermissions('MODULE_ACTION')` on every non-public handler
- Permission naming: `MODULE_ACTION` (underscore, not colon)
- Actions: CREATE, READ, UPDATE, DELETE, MANAGE
- 31 modules × 5 actions = 155 permissions

### 3.3 Audit Trail
- Every mutation (create/update/delete/status change) writes an AuditLog
- Fields: actorId, tenantId, branchId, action, module, entity, entityId, metadata, ipAddress, userAgent
- Sensitive actions require explicit permission + audit + reason/comment

### 3.4 Complete CRUD
- Every admin module ships backend + frontend + docs together
- Every data view has loading, empty, and error states
- Never create-only pages, never half-built modules
- No fake data, no hardcoded dropdowns where master data exists

### 3.5 Security
- No secrets in repo (`.env.example` placeholders only)
- Passwords bcrypt-hashed, never plaintext
- CORS locked to `CORS_ORIGINS`, never `*` in production
- Files private by default, signed-URL access only
- Soft delete preferred for business records

---

## 4. MODULE INVENTORY (46 API, 50+ UI)

### Platform (SaaS Owner)
| Module | API | UI | Status |
|---|---|---|---|
| Tenant | CRUD | List + Form | COMPLETE |
| User | CRUD | List | COMPLETE |
| Permission | Catalog | List | COMPLETE |
| Auth | Login/Register/Refresh | Pages | COMPLETE |
| Platform Dashboard | Stats | Page | COMPLETE |
| Subscription | CRUD | List | COMPLETE |
| Platform Audit | List | Page | COMPLETE |

### Tenant Core
| Module | API | UI | Status |
|---|---|---|---|
| Branch | CRUD | List | COMPLETE |
| Role | CRUD | List | COMPLETE |
| Settings | Tenant/Branch | Full page | COMPLETE |
| Audit Log | List | Page | COMPLETE |
| Activity | Stream | Page | COMPLETE |
| Notification | CRUD | Page | COMPLETE |
| FollowUp | CRUD | List + Form | COMPLETE |
| Dashboard | Stats | Page with charts | COMPLETE |

### CRM
| Module | API | UI | Status |
|---|---|---|---|
| Lead | CRUD + Convert | List + Detail + Form | COMPLETE |
| Client | CRUD | List + Detail + Form | COMPLETE |
| Passport | CRUD | Page | COMPLETE |
| Visa | CRUD | Page | COMPLETE |
| Document | CRUD + R2 presigned | List + Upload | COMPLETE |
| Contract | CRUD + E-sign | Page | COMPLETE |
| Case (Support) | CRUD | Page | COMPLETE |

### Travel Operations
| Module | API | UI | Status |
|---|---|---|---|
| Quotation | CRUD + Status + E-sign | List + Detail + Form | COMPLETE |
| Booking | CRUD + Status | List + Detail + Form | COMPLETE |
| Ticket | CRUD + Issue/Void/Refund | List + Detail + Form | COMPLETE |

### After-Sales
| Module | API | UI | Status |
|---|---|---|---|
| Refund | CRUD + Approve/Process | List | COMPLETE |
| Reissue | CRUD + Approve/Process | List | COMPLETE |
| Cancellation | CRUD + Approve/Process | List | COMPLETE |

### Finance
| Module | API | UI | Status |
|---|---|---|---|
| Invoice | CRUD | List + Detail + Form | COMPLETE |
| Receipt | CRUD | List + Form | COMPLETE |
| Payment | CRUD | List + Form | COMPLETE |
| Expense | CRUD | List + Form | COMPLETE |
| Ledger | List | Page | COMPLETE |

### HRM
| Module | API | UI | Status |
|---|---|---|---|
| Employee | CRUD | List + Detail + Form | COMPLETE |
| Leave | CRUD + Approve | List + Form | COMPLETE |
| Attendance | CRUD | List + Form | COMPLETE |
| Performance | CRUD | List + Form | COMPLETE |
| Salary Profile | CRUD | (via API) | API-ONLY |
| Salary Run | CRUD + Approve | List | COMPLETE |
| Commission | CRUD + Approve | List | COMPLETE |
| Incentive | CRUD | (via API) | API-ONLY |

### Extended
| Module | API | UI | Status |
|---|---|---|---|
| Projects | CRUD | List + Detail (Kanban/Gantt) + Form | COMPLETE |
| Tasks | CRUD | Kanban board | COMPLETE |
| Orders | CRUD | Page | COMPLETE |
| Service Catalog | CRUD | Page | COMPLETE |
| Tax Rates | CRUD | Page | COMPLETE |
| Currencies | CRUD | Page | COMPLETE |
| Calendar | Events + Holidays | Page | COMPLETE |
| Import/Export | CSV import | Page | COMPLETE |
| Reports | 6 categories | 6 pages with charts | COMPLETE |
| Master Data | CRUD + Tenant Override | (via API) | API-ONLY |
| Custom Fields | Settings-based | Page | COMPLETE |
| Visas | CRUD | Page | COMPLETE |

---

## 5. DATA MODEL ARCHITECTURE

### 5.1 Layer Summary
- **Platform**: Tenant, Package, TenantSubscription, TenantSetting
- **Organization**: Branch, Department, DepartmentMember
- **Identity/Auth**: User, RefreshToken, LoginHistory, SecurityEvent
- **RBAC**: Role, Permission, RolePermission, UserTenantMembership, UserBranchMembership, UserRoleAssignment
- **Audit**: AuditLog, Activity
- **Notification**: Notification
- **Document**: Document
- **Master Data**: Country, Nationality, Currency, Airline, Airport, CabinClass, MasterDataCategory, MasterDataItem, TenantMasterDataOverride, MasterLookup (legacy)
- **CRM**: Lead, Client, ClientPassport, ClientVisa, ClientActivity, ClientTask, FollowUp
- **Operations**: Quotation, QuotationLineItem, QuotationRevision, QuotationStatusLog, QuotationSign, Booking, BookingPassenger, BookingSegment, BookingStatusLog, Ticket, TicketStatusLog, Contract, ServiceCategory, ServiceItem, TaxRate, CurrencyConfig, Order, OrderItem
- **Finance**: Invoice, InvoiceLine, Receipt, Payment, Expense, LedgerEntry
- **After-Sales**: RefundRequest, ReissueRequest, CancellationRequest
- **HRM**: Employee, Leave, Attendance, PerformanceReview, SalaryProfile, SalaryRun, SalarySlip, Commission, Incentive
- **Case Support**: Case, CaseReply, CaseChannel, CaseType, CaseGroup
- **Projects**: Project, ProjectMember, Task, TaskChecklist, TaskDependency, ProjectTimeLog
- **Calendar**: Event, Holiday

### 5.2 Mandatory Columns
Every tenant-owned business table MUST have:
```prisma
tenantId    String
branchId    String?
createdById String?
updatedById String?
createdAt   DateTime  @default(now())
updatedAt   DateTime  @updatedAt
deletedAt   DateTime?
@@index([tenantId])
```

Known gaps: 5 after-sales models (RefundRequest, ReissueRequest, CancellationRequest, Commission, SalaryRun) have `createdById` but without `@relation` to User. Fix in M7.

### 5.3 Status Transition Maps
All status changes must validate against transition maps in `common/utils/status-transitions.ts`. Invalid transitions throw `BadRequestException`. Terminal states block further changes. 16 modules have defined maps.

---

## 6. WORKFLOW: LEAD → CLIENT → QUOTATION → BOOKING → INVOICE → PAYMENT → TICKET → REFUND

### 6.1 Core Flow
```
Lead (NEW → CONTACTED → QUALIFIED → WON)
  → Convert to Client
  → Create Quotation (DRAFT → SENT → ACCEPTED → BOOKING_CREATED)
    → Convert to Booking (HELD → CONFIRMED → TICKETED)
      → Create Invoice (DRAFT → SENT → PAID)
        → Receive Payment (PENDING → RECEIVED)
          → Create Receipt + LedgerEntry
      → Issue Ticket (PENDING → ISSUED)
        → Request Refund (REQUESTED → APPROVED → PROCESSED)
          → Reversal LedgerEntry
```

### 6.2 Key Services
- `RelationshipValidationService` — validates tenant/branch/client/lead ownership before cross-entity operations
- `NumberGeneratorService` — tenant-scoped business number generation (PREFIX-YYMMDD-RANDOM4)
- `ActivityService` — unified activity timeline with `findByEntity()`, `logEntityEvent()`
- `AuditService` — global interceptor for all mutation logging
- `StatusTransitions` — validates allowed transitions across all modules

---

## 7. KNOWN ISSUES & PRIORITIZED BACKLOG

### Critical (M7 Priority)

| # | Issue | Impact | Fix |
|---|---|---|---|
| C1 | No real CI pipeline | Lint bypassed, tests bypassed | Wire lint + typecheck + test in CI |
| C2 | eslint not running | No code quality enforcement | Configure eslint for api + web |
| C3 | Minimal tests (16 total) | No regression safety | Expand test coverage per module |
| C4 | No refresh token rotation | Token lifetime risk | Implement refresh token rotation + blacklist |
| C5 | Reports static placeholders | Fake data shown | Wire real aggregated queries |

### High

| # | Issue | Impact | Fix |
|---|---|---|---|
| H1 | NumberGenerator uses Math.random without transaction | Collision risk at high volume | Use Prisma `$transaction` or DB sequence |
| H2 | 23 services use `const where: any` | Type safety gap | Migrate to `Prisma.<Model>WhereInput` |
| H3 | Redundant AuditModule imports in 5 modules | Code bloat | Remove from non-global modules |
| H4 | Department not validated in RelationshipValidationService | Minor isolation gap | Add department validation |
| H5 | No email/SMS notification delivery | Settings exist, no delivery | Integrate with Resend/Twilio |
| H6 | No server-side number generation for some modules | Client-provided numbers | Wire NumberGenerator everywhere |

### Medium

| # | Issue | Impact | Fix |
|---|---|---|---|
| M1 | `@CurrentUser()` typed as `any` in platform controllers | Type safety | Add proper User type |
| M2 | Master data UI not implemented (API exists) | Manual DB edits needed | Build master data admin pages |
| M3 | Demo seed incomplete (no employees/sample data) | Less useful demos | Expand seed data |
| M4 | No health endpoints for DB/storage | Monitoring gap | Add health controllers |
| M5 | No rate limiting per tenant | DOS gap | Extend ThrottlerModule per-tenant |
| M6 | Status transition guards not integrated in all services | Manual validation | Integrate into all mutation services |

---

## 8. M7: SCHEMA HARDENING (CURRENT PRIORITY)

### Phase 7.1 — CI Foundation (2-3 days)
1. Configure eslint for `@travelo/api` and `@travelo/web`
2. Fix all lint errors
3. Wire `pnpm lint` + `pnpm typecheck` + `pnpm test` in CI
4. Add pre-commit hooks (lint-staged + husky)
5. Enforce: no bypass allowed

### Phase 7.2 — Schema Relations (1-2 days)
1. Add `@relation` to `createdById` on RefundRequest, ReissueRequest, CancellationRequest, Commission, SalaryRun, Incentive
2. Add missing `createdById`/`updatedById` where needed
3. Generate and apply migration
4. Validate all `include` queries still work

### Phase 7.3 — Type Safety (1 day)
1. Migrate 23 services from `const where: any` to `Prisma.<Model>WhereInput`
2. Add proper User type to `@CurrentUser()` decorator
3. Remove redundant AuditModule imports

### Phase 7.4 — Number Generator Hardening (0.5 day)
1. Wrap NumberGenerator in Prisma `$transaction` for concurrent safety
2. Add integration test for concurrent number generation
3. Wire into remaining modules that accept client-provided numbers

### Phase 7.5 — Status Guards Integration (1 day)
1. Audit all mutation services for status transition usage
2. Wire `StatusTransitions.validate()` into Booking, Ticket, Invoice, Payment, Expense, Leave, Attendance services where missing
3. Add tests for invalid status transitions

### Phase 7.6 — Tests (2-3 days)
1. Expand tenant-isolation tests (cross-tenant blocking for all entity types)
2. Add workflow E2E tests (Lead→Client→Quotation→Booking→Invoice→Payment→Ticket→Refund)
3. Add RBAC tests per module
4. Add status transition guard tests

---

## 9. M8-M10: ROADMAP

### M8 — Production Hardening
- Refresh token rotation + token blacklist
- Email/SMS notification delivery (Resend/Twilio)
- Health + observability endpoints
- Rate limiting per tenant
- Login history dashboard
- Failed login lockout UI
- Deployment automation scripts

### M9 — Master Data & Reporting
- Master data admin UI (CRUD per category)
- Real report dashboards with DB queries
- Export functionality (CSV, PDF)
- Data import templates
- Tenant onboarding wizard

### M10 — AI & Advanced Features
- Auto-assignment rules engine
- AI quotation drafts
- TTL alerts & reminders
- Predictive analytics (conversion, churn)
- Advanced search (Meilisearch integration)
- Knowledge hub

---

## 10. DEVELOPMENT WORKFLOW

### 10.1 Before Any Change
1. Read `PROJECT_CONTEXT.md` + this document
2. Read the relevant rule doc(s) from `docs/architecture/`
3. Read the target module's existing files
4. Understand tenant scope, permissions needed, and audit requirements

### 10.2 Implementing a Change
1. **DB layer**: model → migration → seed update (if needed)
2. **API layer**: DTO → service → controller → permission → audit → Swagger
3. **UI layer**: list → create → edit → detail → loading/empty/error → mobile
4. **Docs update**: module doc, permissions list, test checklist

### 10.3 Quality Gate (per change)
- [ ] `tsc --noEmit` passes for api + web
- [ ] No new lint errors
- [ ] All existing tests pass
- [ ] New code has tenantId scoping
- [ ] New mutations have audit logs
- [ ] New endpoints have `@RequirePermissions`
- [ ] New UI has loading/empty/error states
- [ ] No cross-tenant data leakage
- [ ] Soft delete used where appropriate

### 10.4 Commit Format
```
<type>(<scope>): <description>

Types: feat, fix, docs, refactor, test, chore, security, perf
Scopes: api, web, db, auth, tenant, branch, lead, client, booking, invoice, ...
```

### 10.5 Response Format for Implementation Work
```
TASK SUMMARY · FILES CHANGED · IMPLEMENTATION · DATABASE IMPACT · API IMPACT ·
SECURITY IMPACT · UI/UX IMPACT · VERIFICATION · COMMIT MESSAGE
```

---

## 11. RULE DOCUMENTS REFERENCE

| Document | Purpose | When to Read |
|---|---|---|
| `PROJECT_CONTEXT.md` | Mental map of the repo | Every session |
| `STRATEGY.md` | This document — permanent strategy | Every session |
| `API_RULES.md` | Endpoint conventions, guards, DTOs | Adding/changing API |
| `DATABASE_RULES.md` | Schema conventions, indexes, soft delete | Schema changes |
| `SECURITY_RULES.md` | Auth, RBAC, sensitive data, files | Auth/finance/PII work |
| `TENANT_RBAC_RULES.md` | Tenant context, permission naming | Guard/permission work |
| `ADMIN_CRUD_RULES.md` | Required pages per module, layer completeness | Building modules |
| `UI_UX_RULES.md` | Design principles, layout standard | Frontend work |
| `DEVELOPMENT_WORKFLOW.md` | Token-saving workflow, commands | Starting any task |
| `INTERCONNECTED_WORKFLOW_PLAN.md` | Full entity relationships, status transitions | Cross-module work |
| `PRODUCTION_AUDIT.md` | Risk assessment, module inventory | Before deployment |
| `STABILIZATION_AUDIT.md` | Issues found/fixed, limitations | Understanding state |
| `LATEST_COMMIT_AUDIT.md` | Verification of latest commit claims | Understanding state |

---

## 12. ENVIRONMENT & COMMANDS

### Ports
- Web: `http://localhost:3901`
- API: `http://localhost:3900/api/v1`
- Swagger: `http://localhost:3900/api/v1/docs`
- PostgreSQL: `localhost:5433`
- Redis: `localhost:6379`

### Essential Commands
```bash
pnpm install              # Install all dependencies
pnpm dev                  # Start api (3900) + web (3901)
pnpm build                # prisma generate → api build → web build
pnpm db:generate          # Regenerate Prisma client
pnpm db:migrate           # Create + apply dev migration
pnpm db:seed              # Seed core data
pnpm db:studio            # Prisma Studio
pnpm lint                 # Lint all packages
pnpm test                 # Run API tests
pnpm --filter @travelo/api exec tsc -p tsconfig.build.json --noEmit   # API typecheck
pnpm --filter @travelo/web exec tsc --noEmit                          # Web typecheck
```

### Docker Services
```bash
docker compose -f infra/docker/docker-compose.yml up -d         # PG + Redis + MinIO
docker compose -f infra/docker/docker-compose.enterprise.yml up -d  # RabbitMQ + Meilisearch
```

---

## 13. ARCHITECTURAL DECISIONS (RECORDED)

| Decision | Rationale | Date |
|---|---|---|
| NestJS as backend, not Cloudflare Workers | PostgreSQL is single source of truth; Workers not ready for full API | Initial |
| `MODULE_ACTION` permission naming (not `module:action`) | Inertia — 155 permissions exist in this format; deliberate migration needed | Initial |
| Soft delete via `deletedAt` | Preserve data integrity for audit/finance | Initial |
| Modular monolith (not microservices) | Single deploy, simpler ops; split later if needed | Initial |
| Client-provided business numbers (not server-generated) | Historical; being migrated to NumberGeneratorService in M7 | Initial |
| MinIO for local dev (not real R2) | No network dependency for local development | Initial |
| `Math.random()` for number generation | Quick implementation; needs transaction wrapper for prod | During M6 |

---

## 14. PERMANENT RULES FOR AI AGENTS

1. **Read before acting**: `PROJECT_CONTEXT.md` → `STRATEGY.md` (this file) → relevant rule doc(s)
2. **Never guess or invent**: All business rules are codified in the rule docs
3. **Small, complete changes**: DB + API + UI + docs together, not piecemeal
4. **Verify before declaring done**: typecheck + tests + lint for the changed area
5. **Respect the stack**: pnpm ONLY, PostgreSQL as source of truth, tenantId everywhere
6. **Never bypass security**: No code without tenant scoping, no mutation without audit, no endpoint without permission
7. **Report impact**: Every change should note security/DB/API/UI impact
8. **Do not rewrite unrelated modules**: Stay focused on the task scope
9. **Follow existing patterns**: Mimic code style, use existing utilities, follow naming conventions
10. **Update this document**: When a major architectural decision is made or a milestone completes, update the relevant section(s)

---

*End of Permanent Strategy. This document supersedes all ad-hoc planning. Update it as the project evolves.*
