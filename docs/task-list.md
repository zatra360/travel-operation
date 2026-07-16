# Travel Operation Platform — Task List

## Reference Folders
```
apps/
  api/          → NestJS backend (controllers, services, DTOs, guards)
    src/modules/  → client/, lead/, booking/, payment/, …
  web/          → Next.js frontend (app router)
    src/app/(dashboard)/  → all tenant-facing pages
      clients/   → [id]/, [id]/edit/, new/, page.tsx, client-form.tsx, client-form-dialog.tsx
      leads/     → [id]/, [id]/edit/, new/, page.tsx, lead-form.tsx, lead-form-dialog.tsx
      bookings/  → invoice/ payment/ expense/ receipt/ ticket/
      passports/ visās/ documents/  → standalone list pages (read-only)
    src/components/  → shared UI (data-table, app-shell, sidebar, world-clock, phone-input)
    src/lib/     → crm.ts (types, enums), api.ts, utils.ts, use-ref-data.ts
    src/stores/  → auth-store.ts
packages/
  database/     → Prisma schema + migrations + seeds
    prisma/schema.prisma  → all models
    prisma/seed.ts        → development seed data
    prisma/demo-seed.cjs  → demo tenant with all features active
  config/       → shared configs
```

## Current State Overview

### Done
- WorldClock (35 timezones, IATA codes, flags) in app-shell
- Consistent form layout across all 41 forms (labels: text-xs font-semibold uppercase tracking-wider)
- Duplicate detection API + UI on client form, lead form, lead form dialog (cross-checks both tables)
- Client activity scoring (0-100, based on bookings/payments/cancellations/refunds/recency)
- Full-page client form (clients/new + clients/[id]/edit) — Card layout matching leads/new
- Passports, Visās, Documents removed from sidebar (now accessible only inside client profile)
- ConfirmDialog replaces all window.confirm()
- N+1 queries eliminated (flat list endpoints for passports, visās, orders, contracts)
- humanizeStatus() on all raw codes, QuoteNumber auto-generated, defaultCurrency from tenant settings
- Passport/Visa CRUD inside client profile (passport-form-dialog.tsx + visa-form-dialog.tsx, add/edit/delete with ConfirmDialog; API now supports relation + isVerified on passports; findByClient filters isActive)
- Document upload/download/delete inside client profile (reuses DocumentUploadDialog with entity=Client)
- Auto-recalculate client score (ClientScoringService in client module, fire-and-forget refreshInBackground() called from booking/payment/refund/cancellation services on create/update/delete/process)
- Edit Client on list navigates to /clients/[id]/edit (ClientFormDialog removed from list; still used on client detail quick-edit)
- Card-based labeled form layouts on tax-rates, currencies, service-catalog (native select replaced with Select component)
- Client list "Sort by Activity" (sortBy=activityScore query param, nulls last)
- Auto-create follow-up when lead status → CONTACTED (scheduledAt = SLA due, skips if a PENDING follow-up exists); overdue follow-ups highlighted (red + Overdue badge) on follow-ups list

### In Progress
- (none)

### To Do
1. (empty — all previous items shipped; add new tasks here)

## Key Files to Reference
| Purpose | File |
|---------|------|
| Gold-standard form layout | `apps/web/src/app/(dashboard)/leads/lead-form.tsx` |
| Full-page client form | `apps/web/src/app/(dashboard)/clients/client-form.tsx` |
| Dialog client form | `apps/web/src/app/(dashboard)/clients/client-form-dialog.tsx` |
| Client detail page | `apps/web/src/app/(dashboard)/clients/[id]/page.tsx` |
| Client API service | `apps/api/src/modules/client/client.service.ts` |
| Lead API service | `apps/api/src/modules/lead/lead.service.ts` |
| Prisma schema (all models) | `packages/database/prisma/schema.prisma` |
| CRM types + enums | `apps/web/src/lib/crm.ts` |
| Sidebar config | `apps/web/src/components/layout/sidebar.tsx` |
| App shell layout | `apps/web/src/components/layout/app-shell.tsx` |
| World clock component | `apps/web/src/components/world-clock.tsx` |
| Country/Airport/Airline hooks | `apps/web/src/lib/use-ref-data.ts` |

## Stored Reference Prompts (Memory)
| Purpose | File |
|---------|------|
| Audit-First ERP (Buy/Sell/Expense/Inventory, immutable ledger, gapless numbering, PostgreSQL) | `docs/prompts/audit-first-erp-prompt.md` |
| ZATRA360 Data-Driven Workplace, Activity Intelligence & Responsible ML | `docs/prompts/zatra360-workplace-intelligence-prompt.md` |
| **ZATRA360 Multi-Service Travel Workflow Engine** (12 service types, ServiceCase/ServiceCaseItem, configurable workflow engine, document/checklist engine, SLA/automation — audit-first repo review then phased implementation) | `docs/prompts/zatra360-service-workflow-prompt.md` |
| Audit sample analysis (Tripnow Limited financials + UK GB Accounts templates) | `docs/audit-sample-notes.md` |
| Raw audit samples (external) | `C:\Dev\Projects\Travel Operation\Audit Sample` |
| **Phase 1–4 accounting foundation — IMPLEMENTED** (hash-chained audit ledger, double-entry journal, posting/reversal DB functions, gapless numbering, idempotency, fiscal periods, COA, GL posting bridge, financial statements, AR/bank reconciliation, period-close checklist, risk alerts — 51 e2e tests) | `docs/accounting-foundation.md` |

## Next Major Initiative (per zatra360-service-workflow-prompt)
0. ~~Phase 1: read-only repo audit~~ — **DONE**, see `docs/service-workflow-audit.md`
1. ~~Phase 2: ServiceType master + Team + ServiceCase/ServiceCaseItem + workflow engine + document lifecycle + permissions + Air Ticket/Visa/Hotel/Tour system templates~~ — **DONE** (19 e2e tests, `apps/api/src/modules/service-ops/`)
2. ~~Phase 3: integrate leads (convert-to-case), quotations, bookings, payments, suppliers + serviceTypeId backfill migration~~ — **DONE** (10 e2e tests; FLIGHT→AIR_TICKET backfill verified 14/14; generic fallback workflow for the remaining 8 types)
3. ~~Phase 4: frontend — Service Selector card grid, /service-cases list + case detail with workflow stepper, blocked-transition explanations~~ — **DONE** (3 routes, production build green)
4. ~~Phase 5: dedicated templates for remaining 8 services~~ — **DONE** (21 e2e tests; all 12 service types on gated workflows)
5. ~~Phase 6: service dashboards + SLA/workload reporting; Phase 7: automation scheduler~~ — **DONE** (all 7 phases of the ZATRA360 workflow prompt delivered; 108 e2e tests)
6. ~~Beyond-prompt: cron wiring for automation scans, Team management UI~~ — **DONE** (116 e2e tests)
7. ~~Beyond-prompt: tenant workflow-template editor, per-service intake forms~~ — **DONE** (126 e2e tests; service-ops backlog complete)
