# Production Deployment Guide

## Prerequisites

- Node.js >= 20
- pnpm >= 9
- PostgreSQL 16
- Cloudflare account (for Pages, R2, DNS)

## Environment Variables

### API (`apps/api/.env`)

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=<random-64-char-string>
CORS_ORIGINS=https://yourdomain.com
NODE_ENV=production
SUPER_ADMIN_EMAIL=admin@yourcompany.com
SUPER_ADMIN_PASSWORD=<strong-password>

# Cloudflare R2 (for document storage)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_ENDPOINT=
```

### Web (`apps/web/.env`)

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

### Database Seed (`packages/database/.env`)

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
SUPER_ADMIN_EMAIL=admin@yourcompany.com
SUPER_ADMIN_PASSWORD=<strong-password>
DEMO_TENANT_SLUG=your-company
```

## Deployment Steps

### 1. Database (Neon PostgreSQL)

```bash
# Create a Neon project and get the connection string
# Add to apps/api/.env and packages/database/.env
```

### 2. Deploy Migrations

```bash
pnpm install --frozen-lockfile
pnpm --filter @travelo/database generate
pnpm --filter @travelo/database exec prisma migrate deploy
pnpm --filter @travelo/database seed
```

### 3. Deploy API (Railway / Fly.io / custom VPS)

```bash
# Build
pnpm --filter @travelo/api build

# Start (from apps/api)
node dist/main.js

# Or use PM2
pm2 start dist/main.js --name travel-api
```

### 4. Deploy Frontend (Cloudflare Pages)

```bash
# Build
NEXT_PUBLIC_API_URL=https://api.yourdomain.com pnpm --filter @travelo/web build

# Deploy the .next/standalone output
# Cloudflare Pages: connect repo, set build command and env vars

# Build command:
pnpm --filter @travelo/web build

# Output directory:
apps/web/.next

# Environment variables:
NEXT_PUBLIC_API_URL = https://api.yourdomain.com
```

### 5. Demo Tenant Setup

```bash
# After seeding, create your demo tenant
pnpm --filter @travelo/database seed:demo
```

## Health Checks

```bash
# API health
GET /api/v1/health
GET /api/v1/health/db
GET /api/v1/health/storage

# Expected response:
{ "status": "ok", "timestamp": "..." }
```

## Security Checklist

- [ ] Change default super admin password
- [ ] Set strong JWT_SECRET (64+ random chars)
- [ ] Configure CORS_ORIGINS to your domain only
- [ ] Set up rate limiting (ThrottlerModule is configured)
- [ ] Enable HTTPS
- [ ] Set up database backups (Neon handles this)
- [ ] Configure R2 bucket with private access
- [ ] Review all seed users and remove demo accounts

## Rollback Plan

1. Revert deployment to previous commit
2. Run `pnpm --filter @travelo/database exec prisma migrate deploy` if schema differs
3. Verify health checks pass

## Monitoring

- API logs: stdout/stderr with structured logging
- Database: Neon dashboard
- Frontend: Cloudflare Pages analytics
- Errors: configure Sentry or similar error tracking

## CI/CD

GitHub Actions workflow runs on push to main:
- Schema validation
- API build
- Web build
- ESLint
- Full test suite with PostgreSQL

See `.github/workflows/ci.yml`
