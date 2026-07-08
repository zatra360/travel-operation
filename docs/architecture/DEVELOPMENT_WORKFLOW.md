# DEVELOPMENT_WORKFLOW

How to work in this repo efficiently and safely. Read before starting a task.

## Token-saving workflow (Graphify-style)

1. Read `PROJECT_CONTEXT.md` + the rule doc(s) relevant to the task.
2. Open ONLY the module files you will touch.
3. Do not re-scan the whole repo each time; do not paste large unchanged files.
4. Work module-by-module. Prefer small, safe, complete changes.
5. Don't rewrite unrelated modules or explain obvious code.
6. Report only: files changed, what, why, impact, verification, commit.

## Package manager

pnpm ONLY. Never npm/yarn. No stray `package-lock.json`. Workspace globs live in
`pnpm-workspace.yaml` (`apps/*`, `packages/*`).

## Common commands (root)

```bash
pnpm install
pnpm dev            # api (3900) + web (3901) via concurrently
pnpm build          # prisma generate → api build → web build
pnpm db:generate    # prisma client
pnpm db:migrate     # dev migration
pnpm db:seed        # seed core data
pnpm db:studio      # prisma studio
pnpm lint           # eslint per package (requires deps installed)
pnpm test           # api tests
pnpm format         # prettier
```

Per-app typecheck (fast verification without full deps):

```bash
pnpm --filter @travelo/api exec tsc -p tsconfig.build.json --noEmit
pnpm --filter @travelo/web exec tsc --noEmit
```

## Ports / env

Web 3901 · API 3900 (`/api/v1`) · Postgres 5433 · Redis 6379. Copy
`apps/api/.env.example` → `.env` and `apps/web/.env.example` → `.env` before dev.

## Adding a module (all layers together)

1. **DB**: model in `schema.prisma` (tenantId + audit fields + indexes) → `db:generate`
   → `db:migrate` → update seed if needed. See `DATABASE_RULES.md`.
2. **API**: `dto/`, `*.service.ts`, `*.controller.ts`, `*.module.ts`; guards +
   `@RequirePermissions` + `@TenantCtx` + audit + Swagger. Register in `app.module.ts`.
   See `API_RULES.md`.
3. **UI**: list/create/edit/detail pages + API client + types + loading/empty/error +
   permission-aware actions + mobile responsive. See `UI_UX_RULES.md` / `ADMIN_CRUD_RULES.md`.
4. **Docs**: module doc under `docs/modules/`, permissions list, test checklist.

## Milestones

M1 Foundation (done) · M2 CRM (in progress) · M3 Travel sales · M4 Finance ·
M5 HRM · M6 Automation/AI. Do not build ahead of the current milestone.

## Pre-commit quality gate

Verify (see standard §21): modular structure, no unrelated changes, docs updated;
tenantId + tenant-scoped uniques + indexes + migration + seed; correct route group +
validation + tenant context + RBAC + Swagger + consistent errors; sensitive data
protected + files private + mutations audited + no cross-tenant leakage; clean
responsive UI with loading/empty/error + permission-aware actions + no fake data;
complete CRUD; build + lint + tenant-isolation + RBAC + module tests pass.

## Response format for implementation work

```
TASK SUMMARY · FILES CHANGED · IMPLEMENTATION · DATABASE IMPACT · API IMPACT ·
SECURITY IMPACT · UI/UX IMPACT · ADMIN CRUD IMPACT · VERIFICATION · COMMIT MESSAGE
```

## Windows note

Git may warn `LF will be replaced by CRLF`. Harmless. To silence:
`git config core.autocrlf false`.

## Old repo (`travelos`) migration

Reference only. Before reusing a module: map old fields → drop cruft → add tenantId →
add branchId where needed → add audit fields → add permissions → API contract →
UI contract → tests → docs. Never copy optional-tenant logic, branch-only isolation,
global-unique business keys, or fake-data patterns.
