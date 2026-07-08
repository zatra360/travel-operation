# Production Deployment Guide

## Overview

Travel Operation can be deployed to production using the following target architecture:

- **Frontend**: Cloudflare Pages
- **Backend**: Node.js hosting (Railway, Render, Fly.io, or VPS)
- **Database**: Neon PostgreSQL
- **Storage**: Cloudflare R2
- **DNS/Security**: Cloudflare DNS, WAF, CDN

## Step-by-Step Deployment

### 1. Database Setup (Neon PostgreSQL)

1. Create a Neon account and project
2. Copy the connection string from the Neon dashboard
3. The connection string format:
   ```
   postgresql://username:password@ep-xxxx.us-east-2.aws.neon.tech/travelo?sslmode=require
   ```

### 2. Storage Setup (Cloudflare R2)

1. Create R2 buckets:
   ```bash
   npx wrangler r2 bucket create travelo-documents
   npx wrangler r2 bucket create travelo-assets
   ```
2. Generate R2 API token in Cloudflare Dashboard
3. Note the endpoint, access key, and secret key

### 3. Backend Deployment

#### Environment Variables

```env
NODE_ENV=production
PORT=3900
DATABASE_URL=postgresql://...
JWT_SECRET=<random-64-char-string>
JWT_EXPIRES_IN=24h
CORS_ORIGINS=https://travelo.com,https://www.travelo.com
R2_ENDPOINT=https://<account>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=<key>
R2_SECRET_ACCESS_KEY=<secret>
R2_BUCKET=travelo-documents
```

#### Deploy to Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and link project
railway login
railway init

# Set environment variables
railway env set DATABASE_URL=<url>
railway env set JWT_SECRET=<secret>

# Deploy
railway up
```

#### Deploy to Fly.io

```bash
# Install flyctl
flyctl launch

# Set secrets
flyctl secrets set DATABASE_URL=<url>
flyctl secrets set JWT_SECRET=<secret>

# Deploy
flyctl deploy
```

### 4. Frontend Deployment (Cloudflare Pages)

```bash
# Build the frontend
cd apps/web
pnpm build

# Deploy to Cloudflare Pages
npx wrangler pages deploy .next

# Or use the Cloudflare Dashboard:
# 1. Go to Pages > Create a project
# 2. Connect your Git repository
# 3. Set build command: pnpm build
# 4. Set build output: .next
# 5. Set environment variables:
#    NEXT_PUBLIC_API_URL=https://api.travelo.com/api/v1
```

### 5. DNS Configuration (Cloudflare)

1. Add your domain to Cloudflare
2. Create DNS records:
   - `A` record for `travelo.com` pointing to Cloudflare Pages
   - `CNAME` record for `api.travelo.com` pointing to your backend host
3. Enable proxy (orange cloud) for CDN and DDoS protection
4. Configure WAF rules as needed

## Post-Deployment

### Run Migrations

```bash
# After API is deployed, run:
pnpm --filter @travelo/database migrate:deploy
pnpm --filter @travelo/database seed
```

### Verify Deployment

1. Visit https://travelo.com/login
2. Login with admin credentials
3. Verify Swagger docs at https://api.travelo.com/api/v1/docs
4. Test tenant creation and branch management
5. Verify audit log entries

## Monitoring

### Backend Health Check

```
GET /api/v1/health
```

### Logging

- API logs structured JSON via console
- Use platform logging (Railway/Render) or external service
- Audit logs stored in database for compliance

## Scaling Considerations

### Database
- Neon PostgreSQL auto-scales
- Add connection pooling for high concurrency
- Consider read replicas for reporting

### API
- Horizontal scaling with stateless design
- Session stored in JWT tokens
- Rate limiting via @nestjs/throttler

### Frontend
- Cloudflare Pages auto-scales
- Static assets served via CDN
- ISR for dynamic content
