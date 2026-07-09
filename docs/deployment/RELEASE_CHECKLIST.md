# Release Checklist

## Before Every Release

### Pre-flight

- [ ] `pnpm install --frozen-lockfile` passes
- [ ] `pnpm --filter @travelo/database exec prisma validate` passes
- [ ] `pnpm --filter @travelo/api build` passes (0 errors)
- [ ] `pnpm --filter @travelo/web build` passes (0 errors)
- [ ] `pnpm --filter @travelo/api lint` passes (0 errors, 0 warnings)
- [ ] `pnpm --filter @travelo/api test` — all tests pass

### Database

- [ ] All migrations committed and tracked in git
- [ ] `pnpm --filter @travelo/database exec prisma migrate deploy` applies cleanly
- [ ] Seed runs without errors: `pnpm --filter @travelo/database seed`
- [ ] Demo seed runs: `pnpm --filter @travelo/database seed:demo`

### Security

- [ ] `JWT_SECRET` is set and 64+ characters
- [ ] `SUPER_ADMIN_PASSWORD` is strong and changed from default
- [ ] `CORS_ORIGINS` is restricted to production domains
- [ ] No hardcoded secrets in source code
- [ ] R2 bucket has private access policy
- [ ] `.env` files are in `.gitignore`

### API

- [ ] All controllers have proper guards (JwtAuthGuard + TenantGuard + PermissionsGuard)
- [ ] Platform routes reject tenant users
- [ ] Tenant routes require `X-Tenant-Id` header
- [ ] Cross-tenant operations are blocked
- [ ] Status transitions are enforced
- [ ] Audit logs created for all mutations
- [ ] Health check endpoint responds: `GET /api/v1/health`

### Frontend

- [ ] Login works with real credentials
- [ ] Platform admin dashboard loads
- [ ] Tenant dashboard loads with real data
- [ ] All list pages load (no blank screens)
- [ ] All detail pages load with connected data
- [ ] Activity timelines visible on detail pages
- [ ] No `any` types in user-facing pages

### Deployment

- [ ] Production `.env` variables set
- [ ] Database backup scheduled
- [ ] SSL/HTTPS enabled
- [ ] Rate limiting configured
- [ ] Error tracking configured (Sentry or similar)
- [ ] CI passing on GitHub Actions
