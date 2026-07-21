# Definition of Done

The universal completion gate. Every task, every PR, every release
must satisfy every item.

## Requirements

- [ ] Acceptance criteria met (every bullet from the ticket).
- [ ] Spec updated (`docs/TRAVEL_OPERATION_PLATFORM_MASTER_SPEC.md`
  or the relevant module doc).
- [ ] Edge cases documented with their behaviour.

## Architecture

- [ ] Module boundary respected (no leaking internal types).
- [ ] Optional modules do not hard-depend on other optional
  modules.
- [ ] Shared interfaces or events used for cross-module wiring.
- [ ] Migration plan in place and reversible.

## Database

- [ ] Migration reviewed (atomic, reversible, indexed).
- [ ] `tenantId` on every tenant-owned table.
- [ ] `branchId` on every branch-scoped table.
- [ ] `deletedAt` for soft-deletable entities.
- [ ] Audit fields (`createdAt`, `updatedAt`, `createdBy`,
  `updatedBy`).

## Tenant isolation

- [ ] Every read query carries tenant scope.
- [ ] Every write query carries tenant scope.
- [ ] Cross-tenant probe fails as expected.
- [ ] `X-Tenant-Id` header is the only source of tenant context.

## Branch isolation

- [ ] Operational entities scope by branch where required.
- [ ] Cross-branch probe fails as expected.

## RBAC

- [ ] Every controller method has the right `RequirePermissions`.
- [ ] Frontend hides what backend rejects (mirrored).
- [ ] Custom roles can be created with a subset of permissions.
- [ ] Unauthorised user bounced off the auth wall.

## Validation

- [ ] Backend DTOs validated with class-validator.
- [ ] Frontend mirrors backend validation messages.
- [ ] Mass assignment blocked (`whitelist: true`,
  `forbidNonWhitelisted: true`).
- [ ] Non-empty normalised string `message` in every error.

## Audit & timeline

- [ ] Every state change writes `audit_logs`.
- [ ] Every state change writes `activity_logs`.
- [ ] Audit records append-only (not editable via product API).

## UI states

- [ ] Loading state rendered.
- [ ] Empty state rendered with CTA.
- [ ] Error state rendered with actionable copy.
- [ ] Permission-denied state rendered.
- [ ] Disabled-module state rendered.

## Accessibility & mobile

- [ ] Every viewport tested (360, 390, 768, 1024, 1440).
- [ ] No horizontal overflow at any viewport.
- [ ] Every icon-only button has `aria-label`.
- [ ] Every decorative SVG is `aria-hidden`.
- [ ] Tab order reaches every interactive element.
- [ ] Focus trap inside modals.
- [ ] Contrast ratio WCAG AA 4.5:1 body, 3:1 large text.

## Tests

- [ ] Unit tests for service-layer business logic.
- [ ] Integration tests for controller + guard wiring.
- [ ] E2E tests for critical user journeys.
- [ ] Regression test for the bug being fixed.
- [ ] Coverage floor respected.

## Build & quality

- [ ] `pnpm lint` passes (or pre-existing failures explicitly
  recorded).
- [ ] `pnpm test` passes (or pre-existing failures explicitly
  recorded).
- [ ] `pnpm build` passes (or pre-existing failures explicitly
  recorded).
- [ ] `pnpm audit` clean or documented exceptions.

## Documentation

- [ ] Spec updated.
- [ ] Module DoD updated.
- [ ] Audit notes updated (if audit-driven change).
- [ ] Runbook updated (if ops-touching change).

## Final

- [ ] Final diff reviewed.
- [ ] No Blocker / Critical / High defect open.
- [ ] Release Verifier status is `READY` or `READY WITH KNOWN
  LOW-RISK ITEMS`.
