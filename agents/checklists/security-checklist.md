# Security Checklist

Non-negotiable items the Security Reviewer must verify for every
change.

## Authentication

- [ ] Password policy enforced (length, complexity,
  breached-password check).
- [ ] Account lockout tier correct (probe-aware).
- [ ] 2FA enrolment optional but discoverable.
- [ ] Magic-link expiry short.
- [ ] Refresh token rotation in place.

## Session handling

- [ ] JWT lifetime documented.
- [ ] Logout revokes refresh token server-side.
- [ ] Concurrent session limit sensible for the role.

## Authorization

- [ ] Every controller method carries the right
  `RequirePermissions`.
- [ ] Frontend mirrors but never replaces backend.
- [ ] Restricted custom role cannot exceed its permission set.
- [ ] Unauthorised user bounced at the auth wall.

## Tenant context

- [ ] `X-Tenant-Id` is the only source of tenant context.
- [ ] Missing header yields 403 with non-leaking message.
- [ ] Cross-tenant probe fails closed.

## Branch context

- [ ] `X-Branch-Id` honoured where required.
- [ ] Cross-branch probe fails closed.

## IDOR

- [ ] Every record accessor checks tenant and (where relevant)
  branch ownership before reading or mutating.

## Mass assignment

- [ ] DTOs whitelist fields (`whitelist: true`).
- [ ] DTOs reject unknown fields (`forbidNonWhitelisted: true`).

## Input validation

- [ ] class-validator on every DTO field.
- [ ] Length / regex constraints on free-form text.
- [ ] File uploads validate MIME from content, not header.

## File uploads

- [ ] MIME type sniff from content.
- [ ] Size limit per route.
- [ ] Anti-virus hook (if available) before storage.

## Presigned URLs

- [ ] Scoped (one bucket, one key, one op).
- [ ] Short expiry (≤ 15 min for write, ≤ 60 min for read).
- [ ] Never reused.

## Secrets

- [ ] Not in browser bundle (`grep -r 'SECRET' apps/web/.next`).
- [ ] Not in server logs.
- [ ] Not in client error messages.
- [ ] Rotated on schedule.

## Logs

- [ ] PII redacted in logs (email, phone, passport, payment).
- [ ] JWTs redacted.
- [ ] Correlation IDs included.

## Rate limits

- [ ] Auth routes throttled (login, refresh, password reset).
- [ ] OTP verify throttled (per user and per IP).
- [ ] Import / export throttled.
- [ ] Expensive reports throttled.

## Injection

- [ ] No raw SQL in features.
- [ ] No string concatenation into Prisma queries.

## XSS

- [ ] No `dangerouslySetInnerHTML` without a documented
  sanitiser.
- [ ] CSP enforced (no `unsafe-inline` for scripts where
  possible).

## CSRF

- [ ] State-changing requests carry CSRF token.
- [ ] Same-site cookies enabled.

## SSRF

- [ ] Outbound HTTP allow-list documented.
- [ ] Redirects not followed blindly.

## Redirects

- [ ] User-supplied redirect URLs allow-listed.

## Exports

- [ ] Streamed, not buffered.
- [ ] Rate-limited.
- [ ] Audited.

## Audit integrity

- [ ] `audit_logs` append-only (no product API can edit).
- [ ] Permission to write audit enforced.

## Dependency risk

- [ ] `pnpm audit` clean.
- [ ] No known-vulnerable transitive deps.
- [ ] License compatibility confirmed.

## Webhooks

- [ ] Signature verification on receipt.
- [ ] Idempotency keys.

## External integration credentials

- [ ] Scoped per integration.
- [ ] Rotated on schedule.

## Bulk actions

- [ ] Per-record authorisation.
- [ ] Rate limit per batch.
- [ ] Audit row per record.
