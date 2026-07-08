# SECURITY_RULES

Security is not optional. Read before touching auth, files, money, or PII.

## Authentication

- Passwords hashed with a strong algorithm (bcrypt/argon2). Never store plaintext.
- JWT access tokens via `JwtAuthGuard`; refresh token rotation on the roadmap.
- Rate limit auth + sensitive endpoints (`ThrottlerModule` is registered globally:
  60s window, 100 req default — tighten for auth/sensitive routes).
- CORS locked to `CORS_ORIGINS` (never `*` in production).

## Tenant / branch isolation (highest priority)

- Never trust a frontend-supplied `tenantId` for scoping. Resolve tenant from the
  authenticated session + `X-Tenant-Id`, then validate membership
  (`TenantContextInterceptor` checks `UserTenantMembership.isActive`).
- Branch access validated against `UserBranchMembership` when `X-Branch-Id` is set.
- Every tenant query is `where: { tenantId, ... }`. Cross-tenant leakage = critical bug.
- Platform super admin bypass exists ONLY via `isPlatformSuperAdmin` in the
  permissions guard — never grant global admin implicitly inside tenant services.

## RBAC enforcement

- Guards run: `JwtAuthGuard` → `TenantGuard` → `PermissionsGuard`.
- `@RequirePermissions('MODULE_ACTION')` required on every non-public handler.
- See `TENANT_RBAC_RULES.md` for roles and the permission catalog.

## Audit + security events

Every mutation writes an `AuditLog` via `AuditService.logMutation(actorId,
tenantId, module, entity, entityId, action, metadata, branchId?)`.

Audit fields: actor, tenantId, branchId, action, module/entity, entityId,
old/new value (where safe), metadata, ipAddress, userAgent, traceId, createdAt.

Log `SecurityEvent` for: login, failed login, permission denied, data export,
sensitive-field reveal/download, and all sensitive actions below.

## Sensitive actions (extra controls)

payment verification, refund approval, ticket void/reissue, invoice void, ledger
adjustment, HR/payroll approval, role/permission change, user deactivation, data
export, tenant suspension, destructive delete.

For each: require explicit permission + audit log + reason/comment. Design for
dual-approval and OTP/re-auth later.

## Sensitive data (PII / secrets)

Passport/NID numbers, visa docs, payment references, salary/payroll, supplier &
GDS/API credentials, client documents.

Handling: mask in UI by default; reveal only with permission; log reveal/copy/
download; store files privately; serve via signed URLs; never expose raw R2 keys.

## Files (see also FILE section of standard)

- Private by default. Signed-URL access only. Permission check before download.
- Soft-delete file metadata first; control actual object deletion.
- Validate upload type + size; log sensitive-file access.

## Secrets

- No secrets in the repo. No hardcoded API keys. Use env vars / secret store.
- `.env.example` files carry placeholders only.

## Credential Vault (design-only for now)

Future-ready interface for GDS creds, airline supplier keys, payment gateway keys,
SMTP/WhatsApp/SMS keys, tenant integration creds. Design the interface; do not
build the full vault until a milestone requires it.

## Never

tenant/branch leakage · global-only business records · unaudited sensitive
mutations · public private-file access · raw stack traces in prod · secrets in git.
