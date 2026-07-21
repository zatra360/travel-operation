# Architecture Checklist

Items the Software Architect reviews before, during, and after a
change.

## Module boundary

- [ ] New module declares what it owns and what it borrows.
- [ ] Module hides internal types (controllers/services not
  exported across module boundaries).
- [ ] Optional modules use shared interfaces or events, never
  hard imports from other optional modules.
- [ ] DI tokens are explicit (no implicit singletons).

## Data ownership

- [ ] Every tenant-owned entity carries `tenantId`.
- [ ] Every branch-scoped operational entity carries `branchId`.
- [ ] Soft-delete (`deletedAt`) used for audit-sensitive
  entities. Hard-delete only for `audit_logs` itself (append-only).
- [ ] Reference data lives in `master-data` (countries,
  nationalities, currencies, statuses) — never duplicated.

## Database

- [ ] New tables indexed by `tenantId` (composite index with
  common filter columns).
- [ ] Foreign keys cascade on tenant/branch deletion if and only
  if the dependent row is owned (no orphan rows).
- [ ] Migration reviewed for reversibility.
- [ ] No raw SQL in features; Prisma models only.

## API contracts

- [ ] Static segments (e.g. `/score`, `/timeline`, `/merge`)
  declared before the `:id` wildcard to avoid NestJS route
  shadowing.
- [ ] Pagination envelope is
  `{success, data, page, totalPages, total, limit}` (or
  documented as different in the spec).
- [ ] Error envelope is `{success:false, statusCode, message,
  timestamp}` with a non-empty normalised string `message`.
- [ ] `Accept` content negotiation respected for SSE
  (`text/event-stream`).

## State machine

- [ ] Allowed transitions enumerated in `docs/modules/<name>/`.
- [ ] Terminal states identified.
- [ ] Re-entry to a previous state is intentional and audited.
- [ ] Every transition writes `audit_logs` + `activity_logs`.

## Permission architecture

- [ ] Permission keys added to `packages/permissions`.
- [ ] Permission keys distributed to seed roles as appropriate.
- [ ] Frontend permission check mirrors backend enforcement.

## Event contracts

- [ ] New domain events documented in `docs/architecture/`.
- [ ] Event consumers registered (in-process subscriber,
  external queue, etc.).
- [ ] At-least-once delivery for audit-crucial events.

## Automation & hooks

- [ ] `cron` cadence documented.
- [ ] TTL behaviour (hold, payment, visa) documented.
- [ ] Retry & dead-letter for external integrations.

## AI extension points

- [ ] Prompts stored outside the client bundle (API side).
- [ ] Deterministic post-processor in front of AI output.
- [ ] User-visible confirmation before AI commits an action.

## Integration boundaries

- [ ] External service contracts documented (request/response
  schemas, auth, rate limits).
- [ ] Presigned URLs scoped (one bucket, one key, one op, short
  expiry).
- [ ] Webhook signature verification documented.
- [ ] Idempotency keys for mutating calls.

## Migration

- [ ] Migration order documented.
- [ ] Back-fill plan attached.
- [ ] Dual-write window sized.

## Testing strategy

- [ ] Layered tests: unit (service), integration (controller +
  guard), e2e (journey).
- [ ] Snapshot / regression tests for state machines.
- [ ] Fuzz tests for boundary inputs.

## Scalability

- [ ] Read paths: list queries are paginated server-side.
- [ ] Write hotspots: counters updated in the smallest possible
  scope.
- [ ] Long-running jobs: moved off the request path.
- [ ] Multi-instance fan-out (SSE, notification, cron) addressed
  in the design.
