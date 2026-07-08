# Stabilization Audit

**Commit audited:** `58af3bf` — "Add M3-M6: Travel Sales, Finance, HRM, Automation + UI fixes"

**Date:** 2026-07-08

## Build Status

| Step | Result |
|------|--------|
| `pnpm install` | PASS |
| `pnpm db:generate` | PASS |
| `pnpm --filter @travelo/api build` | PASS |
| `pnpm --filter @travelo/web build` | PASS |
| Total modules | 27 API + 22 frontend |

## Database Issues Found/Fixed

1. **Missing Prisma relations** — Quotation, Booking, Ticket, Invoice, Payment, Expense, Employee, Leave, Attendance, PerformanceReview have foreign key scalars (`clientId`, `assignedToId`, `bookingId`, etc.) but no `@relation` directives. Services handle validation manually. Not blocking for MVP but should be added before production to enable `include` queries and referential integrity.

2. **Employee.userId missing relation** — `userId` on Employee model has no `@relation` to User. Not blocking.

3. **No soft delete on Ticket, Payment, Receipt** — intentional for these models.

**Status:** Schema is MVP-safe. Add relations in next milestone.

## API Issues Found/Fixed

1. **ActivityController missing permission** — Had `PermissionsGuard` but no `@RequirePermissions`. Fixed: removed `PermissionsGuard`, kept `JwtAuthGuard + TenantGuard`. Activity stream is internal and available to all authenticated tenant users.

2. **Audit log route mismatch** — Frontend called `/api/v1/tenant/audit` but controller at `tenant/audit-logs`. Fixed in frontend (`audit-log/page.tsx`).

**Status:** All 27 modules have proper guards, tenant isolation, and permissions.

## Security Issues Found/Fixed

1. **Settings profile update** — `PUT /api/v1/auth/profile` properly requires current password for password change.

2. **Tenant creation** — Creates owner role with all permissions, validates user exists before assignment.

3. **No secrets committed** — `.env.example` templates only, no real credentials.

4. **R2 presigned URLs** — 15-minute expiration, audited on sensitive document download.

5. **CORS** — Configured from `CORS_ORIGINS` env var, defaults to `http://localhost:3901`.

**Status:** MVP security baseline met.

## UI Issues Found/Fixed

1. **Layout scrolling** — Main content had no overflow scroll. Fixed with `h-[calc(100vh-3.5rem)] overflow-y-auto`.

2. **Sidebar flat list** — Reorganized into 6 labeled groups (Core, CRM, Operations, Finance, HRM, System).

3. **Profile page** — Created for both tenant (`/profile`) and platform (`/platform/profile`) with shared API.

4. **Platform/tenant mode switch** — Super admins see "Platform Admin" link in tenant sidebar, "Back to App" in platform sidebar.

5. **Settings page** — Logo upload via R2 presigned URL, 4 editable sections with independent save.

6. **All sidebar links have pages** — 29/29 verified, 0 dead links.

7. **Reports, Settings, Platform Dashboard** — marked as static placeholders intentionally.

**Status:** All critical UI issues fixed.

## Known Limitations

- No server-side number generation for quote/booking/invoice/receipt/expense numbers (client-provided, validated tenant-scoped)
- No status transition guards (any status change allowed)
- No cross-entity validation (e.g., booking's clientId matching quotation's clientId)
- No email/SMS notification delivery (settings available, no delivery)
- No automated ledger entries from finance mutations
- No 2FA implementation (setting available)
- No role/permission UI management (backend only)
- Reports page is static placeholder
- Master data pages not implemented (API available)
- No database migrations tracked (schema changes require `prisma migrate dev`)
- Missing `@relation` directives on many models

## Next Safe Milestone

M7 — Schema hardening: add Prisma relations, generate migration, add status transition guards, add server-side number generation, add basic integration test for tenant isolation.
