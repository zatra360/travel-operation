# Workflow: Audit a Module

A read-only, multi-angle pass over a module, designed to surface
every defect before a release.

## Chain

```text
Product Analyst        (business completeness)
Software Architect     (architecture)
Security Reviewer      (security)
UI/UX Reviewer         (usability)
QA Engineer            (functionality)
Release Verifier       (consolidated decision)
```

**This workflow must remain read-only unless the user explicitly
asks to fix findings.** The agents inspect, they do not edit.

## Step 1 — Product Analyst

Walk through every user journey documented in the module. Compare
the spec to the code. Identify every acceptance criterion that
lacks an implementation. Document behaviours that contradict the
spec.

## Step 2 — Software Architect

Inspect:

- Module boundary — does the module leak internal types or
  create hard dependencies on other optional modules?
- Data ownership — every record has a tenantId; every
  branch-scoped entity has branchId.
- API contracts — static segments before `:id` to avoid NestJS
  route shadowing.
- Pagination envelope — `{success, data, page, totalPages, total}`
  consistent.
- State machine — every transition writes audit and activity.

## Step 3 — Security Reviewer

Inspect:

- Every controller method carries the right permission.
- TenantGuard reads `X-Tenant-Id` from header only.
- No secrets in browser bundle or logs.
- File uploads validate MIME from content.
- Rate limits on auth and expensive routes.
- Audit logs append-only.

## Step 4 — UI/UX Reviewer

Inspect:

- Every state visible (loading, empty, error, permission-denied,
  disabled-module).
- Every viewport (360, 390, 768, 1024, 1440) — no horizontal
  overflow.
- Every icon-only button has `aria-label`.
- Every decorative SVG is `aria-hidden`.
- Keyboard navigation reaches every interactive element.
- Form errors surface inline and as a toast.

## Step 5 — QA Engineer

Run functional tests for every documented user journey. Cross-
tenant and cross-branch probes must return expected errors, not
data leaks. Audit log assertions included.

## Step 6 — Release Verifier

Consolidate the findings from steps 1-5 into a single audit
report. Return one of:

- `READY` — no audit findings, module is production-clean.
- `READY WITH KNOWN LOW-RISK ITEMS` — no Blocker / Critical / High.
- `NOT READY` — Medium or High findings remain.
- `BLOCKED` — Blocker or Critical finding remains.

The audit report becomes the input to the `fix-bug.md` workflow
(if the operator asks to fix findings).

## Refuse

- Treating "the lint passed" as a substitute for the audit.
- Skipping any agent because "they would not find anything".
- Editing code mid-audit (breaks the read-only promise and the
  evidence chain).
