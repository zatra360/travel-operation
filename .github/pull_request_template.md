# Pull Request

> Use this template for every PR. Replace the placeholder text with
> concise, accurate answers — not lorem ipsum.

## Summary

One-paragraph description of the change.

## Why

The problem this PR solves. Link to the ticket or audit report.

## Scope

What is in scope. What is explicitly out of scope.

## Architecture impact

- Module(s) affected.
- Boundary preserved / changed.
- Optional modules: any new dependency between them (must be
  none).

## Database impact

- New tables / columns / indexes.
- Migration direction + reversibility.
- Back-fill strategy (if any).
- Audit / activity log changes.

## API impact

- Endpoints added or modified.
- RBAC changes (new permissions, distribution to roles).
- Response envelope changes.
- Rate-limit changes.

## Permission impact

- New permission keys.
- Roles affected.
- Mirrored on frontend?

## Audit / timeline impact

- New `audit_logs` actions.
- New `activity_logs` events.
- Reversible? (Audit must remain append-only.)

## UI states

- Loading.
- Empty.
- Error.
- Permission denied.
- Disabled module.

## Tests

- Unit tests added or updated.
- Integration tests added or updated.
- E2E tests added or updated.
- Regression test for the bug (if any).

## Commands executed

```bash
# examples — list what you actually ran
pnpm test
pnpm lint
pnpm build
node scripts/audit/_audit-<page>.mjs verify
```

## Screenshots

- Desktop (1440):
- Laptop (1024):
- Tablet (768):
- Mobile (390):
- Mobile (360):

## Risks

- Migration risk:
- Rollback risk:
- Performance risk:
- Tenant isolation risk:

## Rollback

The one-line revert path. Include the migration down-step where
relevant.

## Definition of Done

Confirm every box in `agents/checklists/definition-of-done.md`:

- [ ] Requirements implemented
- [ ] Architecture respected
- [ ] Database migration reviewed
- [ ] Tenant isolation verified
- [ ] Branch isolation verified
- [ ] RBAC enforced
- [ ] Backend validation added
- [ ] Frontend validation added
- [ ] Audit logging added
- [ ] Activity timeline integrated
- [ ] Loading / empty / error / permission-denied / disabled-module
      states rendered
- [ ] Mobile layout verified
- [ ] Accessibility checked
- [ ] Tests added or updated
- [ ] Lint passes (or pre-existing failures recorded)
- [ ] Type-check passes (or pre-existing failures recorded)
- [ ] Tests pass (or pre-existing failures recorded)
- [ ] Build passes (or pre-existing failures recorded)
- [ ] Documentation updated
- [ ] Final diff reviewed
- [ ] No unresolved High-severity defect
