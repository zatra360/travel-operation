# Environment Variables

## Required

### API (`apps/api/.env`)

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/travelo` |
| `JWT_SECRET` | JWT signing secret (64+ random chars) | `openssl rand -hex 64` |
| `NODE_ENV` | Environment | `development` / `production` |
| `SUPER_ADMIN_EMAIL` | Platform super admin email | `admin@yourcompany.com` |
| `SUPER_ADMIN_PASSWORD` | Platform super admin password | `StrongP@ssw0rd!` |

## Optional — Document Storage (Cloudflare R2)

| Variable | Description |
|---|---|
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 access key |
| `R2_SECRET_ACCESS_KEY` | R2 secret key |
| `R2_BUCKET_NAME` | R2 bucket name |
| `R2_ENDPOINT` | R2 endpoint URL |

## Optional — CORS

| Variable | Default |
|---|---|
| `CORS_ORIGINS` | `http://localhost:3901` |

## Optional — Demo Tenant

| Variable | Default |
|---|---|
| `DEMO_TENANT_SLUG` | `demo-travel` |

### Web (`apps/web/.env`)

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | API base URL | `http://localhost:3900` |

### Database (`packages/database/.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | Same as API — used for migrations and seed |

## Generating a JWT Secret

```bash
# Linux/macOS
openssl rand -hex 64

# Windows PowerShell
-join ((1..64) | % { [char](Get-Random -Min 33 -Max 126) })
```

## .env Example Files

- `apps/api/.env.example`
- `apps/web/.env.example`
- `packages/database/.env.example`
