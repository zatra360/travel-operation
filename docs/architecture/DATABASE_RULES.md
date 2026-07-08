# DATABASE_RULES

Applies to `packages/database` (Prisma + PostgreSQL). Read before any schema change.

## Golden rules

- PostgreSQL is the single source of truth. No manual DB edits, no schema drift.
- **Every schema change ships a migration.** Never `db push` to production.
- Update the seed when core roles/permissions/master data change.

## Tenant ownership

Every tenant-owned business table MUST carry a direct `tenantId`. Never rely on
`branchId` alone for isolation.

Mandatory columns for tenant-owned tables:

```prisma
tenantId    String
branchId    String?     // where branch-scoped
createdById String?
updatedById String?
createdAt   DateTime  @default(now())
updatedAt   DateTime  @updatedAt
deletedAt   DateTime?   // where soft delete applies
```

Required indexes:

```prisma
@@index([tenantId])
@@index([tenantId, branchId])
@@index([tenantId, deletedAt])
```

> NOTE (current state): early foundation models (Lead, Client, FollowUp) include
> `tenantId`/`branchId` + indexes but do NOT yet have `createdById`/`updatedById`
> on every table. New tables MUST include them. Backfilling existing tables is a
> tracked follow-up — do it via migration, not silently.

## Unique constraints are tenant-scoped

Good:

```prisma
@@unique([tenantId, quoteNumber])
@@unique([tenantId, bookingRef])
@@unique([tenantId, invoiceNumber])
@@unique([tenantId, employeeCode])
@@unique([tenantId, branchId, code])
```

Never global-unique business identifiers: `quoteNumber @unique` etc. are forbidden.

## Soft delete

- Prefer soft delete (`deletedAt`) for business records.
- All read queries filter `deletedAt: null` by default.
- Hard delete only for join/child rows with no history value (document it).

## Master data

Platform master data may be global, but design for tenant override later.
Examples: Airlines, Airports, Countries, Currencies, Routes, CabinClass,
BookingClass, FareRule, BaggageRule, ServiceType, PaymentMethod.

Strategy: global table + optional tenant-override table / branch setting.
Never hardcode dropdowns in UI when master data exists.

## Finance data is append-first

- Never silently overwrite financial history.
- Use ledger entries, payment status history, invoice status logs, refund/reversal
  approval logs.
- Keep money components separate: base price, markup, tax, VAT, discount,
  service charge, final total.

## Reporting-ready columns

Every module carries: `tenantId`, `branchId`, `status`, `createdAt`, `updatedAt`,
`assignedToId` (CRM), amount fields (finance), `source`/`type`/`category` where
useful. No report should require cross-tenant queries.

## Workflow

```bash
# after editing packages/database/prisma/schema.prisma
pnpm db:generate        # regenerate client
pnpm db:migrate         # create + apply dev migration
pnpm db:seed            # if core data changed
```

Migration naming: describe the change (`add_document_asset`, `add_created_by_to_lead`).
