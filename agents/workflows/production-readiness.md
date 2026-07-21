# Workflow: Production Readiness

A pre-launch pass that confirms the platform can serve real users
safely and recoverably.

## Required checks

### Environment validation

- All required env vars documented in `.env.example`.
- Secrets present in the secret manager, not in code.
- `NODE_ENV=production`.
- `PORT` and `CORS_ORIGINS` set correctly.
- Database connection string resolved, credentials rotated.

### Production build

- `pnpm install --frozen-lockfile`.
- `pnpm db:generate` clean.
- `pnpm --filter @travelo/api build` clean.
- `pnpm --filter @travelo/web build` clean.
- Bundle sizes reviewed (no regression over previous release).

### Migrations

- Migration order documented.
- Migration is reversible (`down` migration tested in dev).
- Back-fill strategy for any data reshape.
- Long-running migrations noted (lock duration, batch size).

### Rollback strategy

- Last release tagged and reproducible.
- Database migration down-step rehearsed in staging.
- Feature flags ready to disable new behaviour.

### Secrets

- No secrets in client bundle.
- No secrets in server logs.
- Tokens rotated on a schedule.
- API keys scoped per integration.

### Monitoring

- Health check route exposed (`/healthz` or equivalent).
- Process metrics flowing (CPU, memory, RSS).
- Request latency p50 / p95 / p99 visible.
- Error rate alerting on 5xx surge.

### Error tracking

- Exceptions captured with correlation IDs.
- Stack traces include the original cause (no swallowed `catch`).
- User-facing messages non-leaking.

### Health checks

- DB connectivity check.
- Cache connectivity check.
- External-integration connectivity check.

### Backups

- Database backup schedule confirmed.
- Last successful backup verified.
- Restoration procedure documented and rehearsed quarterly.

### Rate limiting

- Auth routes rate-limited.
- Import / export routes rate-limited.
- Expensive reports rate-limited.
- Global `429` response uses normalised message.

### Security headers

- `Content-Security-Policy` configured.
- `Strict-Transport-Security` (HSTS).
- `X-Content-Type-Options: nosniff`.
- `X-Frame-Options: DENY` or `frame-ancestors 'none'`.
- `Referrer-Policy: strict-origin-when-cross-origin`.
- COOP / CORP for isolation.

### Storage configuration

- Buckets private by default.
- Public buckets only for assets that must be public.
- Lifecycle rules on log buckets.

### Deployment documentation

- One-command deploy script referenced from `docs/deployment/`.
- Runbook for on-call.
- Recent incidents reviewed (the five-whys).

## Output

A "production readiness" report attached to the release PR. The
Release Verifier signs off only when every box above is checked.
