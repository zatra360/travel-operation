# Database Checklist

Items every Prisma change must satisfy.

## Schema

- [ ] `tenantId` on every tenant-owned model.
- [ ] `branchId` on every branch-scoped model.
- [ ] `deletedAt DateTime?` for soft-deletable models.
- [ ] Audit fields present: `createdAt`, `updatedAt`, `createdBy`,
  `updatedBy`.
- [ ] Indexes on `tenantId` (composite with common filter
  columns).
- [ ] Indexes on `branchId` for branch-scoped tables.
- [ ] Indexes on foreign keys used in joins.
- [ ] Indexes on enum fields used in filters.
- [ ] Unique constraints explicit (`@@unique([tenantId, email])`,
  not global `email`).

## Migrations

- [ ] Migration atomic (one logical change).
- [ ] Migration reversible (down migration written and tested).
- [ ] Migration order documented (older migrations first).
- [ ] Migration tested against a production-shaped dataset.
- [ ] Long-running migrations use `CONCURRENTLY` for indexes
  (Postgres) or batched updates for back-fill.

## Data integrity

- [ ] Foreign keys cascade where appropriate; restrict where
  audit-sensitive.
- [ ] Check constraints for enum-like columns.
- [ ] No raw SQL outside migration files.
- [ ] No data deletion in migrations except for back-fill
  justification (audited).

## Soft-delete

- [ ] Soft-delete sets `deletedAt = now()`, never
  `DELETE FROM`.
- [ ] All read queries filter `where deletedAt is null` (or
  explicitly opt-in for admin views).
- [ ] No code path bypasses soft-delete.

## Audit logs

- [ ] `audit_logs` table is append-only (no UPDATE/DELETE
  endpoints).
- [ ] Every state-changing service writes one `audit_logs` row.
- [ ] `audit_logs` includes `tenantId`, `actorId`, `resource`,
  `resourceId`, `action`, `details` JSON, `branchId?`.

## Activity logs

- [ ] `activity_logs` table is append-only.
- [ ] Every state-changing service writes one `activity_logs`
  row.
- [ ] Timeline service merges `audit_logs` + `activity_logs`
  with consistent ordering.

## Tenant scoping

- [ ] Every Prisma query carries `tenantId` in `where`.
- [ ] No helper bypasses tenant scope.
- [ ] Cross-tenant probe fails closed.

## Performance

- [ ] N+1 queries eliminated (`include` / `select` strategy).
- [ ] Long result sets use cursor pagination for hot paths.
- [ ] JSON columns have explicit shape (`@db.JsonB` where
  Postgres).
- [ ] No `SELECT *` over a join.

## Back-up and recovery

- [ ] Backup schedule documented.
- [ ] Last successful backup verified before release.
- [ ] Restore procedure rehearsed.
