# UI_UX_RULES

Applies to `apps/web`. Read before building any screen.

## Goal

Clean, premium, enterprise-grade, fast operational SaaS UI — inspired by Ever Gauzy
*quality* (not its code/branding), tailored to travel operations. Not a boring admin
panel, not a cluttered ERP. Default to a clean light theme; dark mode later.

## Principles

- Mobile-first and fully responsive. Desktop: fixed left sidebar. Mobile: compact/
  bottom navigation, tables collapse to cards.
- Search-first workflow. Quick-create actions. Status-driven design.
- Consistent buttons, forms, tables, badges, spacing.
- Every data view has **loading, empty, and error** states.
- Accessible contrast, keyboard-friendly actions.
- Copyable important fields (PNR, refs, invoice numbers).
- Timeline on major records.

## Zero-friction / minimal typing

Manual typing ONLY for: amounts, prices, PNR, passport numbers, reference IDs,
critical remarks, approval notes, sensitive financial values.

Everything else must be searchable / selectable / auto-suggested / template-driven /
remembered. Never hardcode dropdowns that should come from master data or the API.

## Building blocks (current)

- `components/layout/`: `app-shell`, `sidebar` (role-aware nav), `topbar`.
- `components/ui/`: shadcn primitives — `button`, `card`, `badge`, `input`, `label`,
  `avatar`, `separator`. Add new primitives here, matching existing style.
- `components/providers/query-provider`: React Query provider.
- `lib/api.ts`: fetch wrapper — injects JWT + `X-Tenant-Id`, unwraps `{ data }`.
- `stores/auth-store.ts`: zustand `user`, `activeTenant`, `logout`.

Badge variants available: `default, secondary, destructive, outline, success,
warning, info`. Use `success/warning/info/destructive` for status semantics.

## Page layout standard

```
Header    : title, subtitle, primary action (permission-aware)
Toolbar   : search, filters, export (only if permitted)
Content   : table (desktop) / cards (mobile) / form
Secondary : timeline, notes, summary (where useful)
Action bar: save / cancel for forms (sticky where useful)
```

## Data fetching pattern

- Use React Query for new pages (server state, caching, retries). Existing pages use
  `useEffect + api`; migrate opportunistically, don't rewrite wholesale.
- Always pass `{ tenantId: activeTenant.id }` to `api.*` for tenant routes.
- Read list responses as `{ data, total, page, limit, totalPages }`.

## Permission-aware UI

- Hide/disable actions the user lacks permission for. Buttons reflect RBAC.
- Never render a mutating control that the API will reject — check permission first.

## Reference (Leads list, `app/(dashboard)/leads/page.tsx`)

Search input + status filter chips + responsive table + loading/empty states +
semantic status/priority badges. Mirror this shape for new list pages.

## Do NOT

fake/static data in production routes · silent failed fetch · random colors ·
gradient overuse · copy Ever Gauzy exactly · create-only pages without list/edit/view.
