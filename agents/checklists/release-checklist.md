# Release Checklist

Final pre-launch gate. The Release Verifier confirms every box
before returning `READY` or `READY WITH KNOWN LOW-RISK ITEMS`.

## Requirement

- [ ] Acceptance criteria met (every bullet).
- [ ] Edge cases documented with behaviour.
- [ ] "What happens when the optional module is disabled"
  answered.

## Architecture

- [ ] Module boundary respected.
- [ ] Optional modules do not hard-depend on each other.
- [ ] Migration plan reviewed and reversible.

## Code review

- [ ] No Blocker / Critical findings open.
- [ ] Every High finding resolved or tracked with owner and date.
- [ ] Diff is minimal and focused.

## Database

- [ ] Migration reversible.
- [ ] Indexes in place.
- [ ] Soft-delete preserved.
- [ ] Audit / activity rows written for every state change.

## API

- [ ] RBAC enforced on every endpoint.
- [ ] Response envelope consistent.
- [ ] Error message normalised.
- [ ] Rate-limited where required.

## UI

- [ ] Every state rendered.
- [ ] Every viewport tested.
- [ ] A11y counters all zero.
- [ ] Keyboard reachability verified.

## Permissions

- [ ] Backend gates every frontend restriction.
- [ ] Custom roles tested for boundary behaviour.

## Tenant isolation

- [ ] Cross-tenant probe fails.
- [ ] Bulk action auth per record verified.

## Branch isolation

- [ ] Cross-branch probe fails.

## Security

- [ ] Secrets absent from bundle and logs.
- [ ] Headers configured (CSP, HSTS, nosniff, frame-options,
  referrer-policy, COOP, CORP).
- [ ] Rate limits verified.
- [ ] Audit immutability verified.

## Tests

- [ ] `pnpm test` green.
- [ ] Coverage floor respected.
- [ ] Regression test for the fixed bug.

## Build

- [ ] `pnpm lint` green (or pre-existing failures documented).
- [ ] `pnpm build` green (or pre-existing failures documented).
- [ ] `pnpm audit` clean (or documented exceptions).

## Documentation

- [ ] Spec updated.
- [ ] Module DoD updated.
- [ ] Audit notes updated.
- [ ] Runbook updated (if ops-touching).

## Deployment

- [ ] Env vars documented.
- [ ] Migration order documented.
- [ ] Rollback rehearsed.
- [ ] Feature flags configured.
- [ ] Health check endpoint responds.
- [ ] Monitoring and alerting in place.
- [ ] Last backup verified.

## Regression

- [ ] No other module broke.
- [ ] Smoke test on critical journeys green.
- [ ] Recent-incident review completed (the five-whys).

## Final

- [ ] Release status decided:
  `READY` / `READY WITH KNOWN LOW-RISK ITEMS` / `NOT READY` /
  `BLOCKED`.
- [ ] Operator informed of the decision and the rationale.
