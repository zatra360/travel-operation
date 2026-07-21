# Copilot Instructions

> Concise architectural + operational rules for AI-assisted code
> generation in this repository.

The full operating system lives in `../AGENTS.md` and
`../agents/`. This file summarises the rules any AI coding agent
must respect, regardless of which surface (Copilot, Cursor, Claude,
Codeium, etc.) is producing suggestions.

## Architecture

- Monorepo: `apps/web` (Next.js 16), `apps/api` (NestJS 11),
  `packages/{database,config,types,permissions,validators}`.
- Single PostgreSQL via Prisma.
- Multi-tenant SaaS. `tenantId` on every tenant-owned table.
- Multi-branch. `branchId` on every branch-scoped operational
  table.

## Tech stack

- TypeScript strict, pnpm workspaces.
- Backend: NestJS, Prisma, class-validator, Swagger.
- Frontend: Next.js (App Router), React 19, shadcn-style
  primitives, Lucide icons.
- Auth: JWT + refresh tokens + optional TOTP 2FA.
- Real-time: Server-Sent Events for notifications.
- Storage: S3-compatible (presigned URLs only).
- Background jobs: `cron` + TTL automation.

## Tenancy rules

- The single source of tenant context is the `X-Tenant-Id` header
  read by `TenantGuard`. Query strings and body fields are not
  accepted.
- `tenantId` is derived from the JWT. Users cannot manually switch
  tenant.
- Cross-tenant record attachment is impossible. Every record
  accessor checks tenant ownership.

## RBAC rules

- Backend is the source of truth. Frontend checks are mirrored, not
  relied upon.
- Every controller method carries `@RequirePermissions('<MODULE>_<VERB>')`.
- Permission keys live in `packages/permissions`. Distribution to
  seed roles is data-driven.

## Module boundaries

- Optional modules do not hard-depend on other optional modules.
  Use shared interfaces, domain events, or adapters.
- New code that crosses modules belongs in the appropriate module
  — not in a catch-all.
- DI tokens are explicit (no implicit singletons).

## Implementation sequence

For every non-trivial change:

1. Inspect existing code.
2. Find existing patterns.
3. Identify every affected layer.
4. Implement smallest coherent change.
5. Update Prisma (if data shape changes).
6. Update shared types.
7. Update validators.
8. Update permissions.
9. Add backend authorisation.
10. Implement business logic.
11. Implement frontend behaviour.
12. Add loading, empty, error, permission-denied, disabled-module
    states.
13. Add audit events.
14. Add activity timeline events.
15. Add or update tests.
16. Update documentation.
17. Run verification.
18. Review final diff.

## Verification expectations

Every change must produce evidence:

- `pnpm test` output.
- `pnpm lint` output.
- `pnpm build` output (where applicable).
- A Playwright probe for any user-facing change.
- A tenant-isolation probe payload + response.
- A branch-isolation probe payload + response.
- A screenshot for every viewport touched.

Pre-existing failures must be recorded as pre-existing, not
ignored.

## Prohibited shortcuts

- `any` casts on network responses without justification.
- `dangerouslySetInnerHTML` without a documented sanitiser.
- `Date.now()` inside render.
- `useCallback` over async timer with dynamic-prop closure.
- Hard-delete of audit rows.
- Presigned URLs reused across operations.
- Secrets in client bundle.
- Frontend-only RBAC enforcement.
- Manual tenant switches.
- Cross-tenant record attachment.
- Bulk actions without per-record authorisation.
- Skipping the `release-checklist.md` before merging.

## When in doubt

Read `../AGENTS.md` and the relevant agent file under `../agents/`.
If a change touches more than one agent's domain, run the matching
workflow under `../agents/workflows/`.
