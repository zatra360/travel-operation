# Cloudflare setup

Account and resources for the zatra360 project.

## Account

| Field | Value |
|-------|-------|
| Account name | Zatra360 |
| Account ID | `29cb84c6f8d3d3652b453a529f2e06f9` |
| Login email | zatra360@gmail.com |
| Domain | zatra360.com |

> Wrangler must be authenticated to this account. If a stale
> `CLOUDFLARE_ACCOUNT_ID` env var points elsewhere, unset it or set it to the ID
> above (`$env:CLOUDFLARE_ACCOUNT_ID='29cb84c6f8d3d3652b453a529f2e06f9'`).

## Domains (planned)

| Host | Purpose |
|------|---------|
| zatra360.com | Web app (Cloudflare Pages) |
| *.zatra360.com | Tenant subdomains |
| api.zatra360.com | NestJS API (separate Node host) |

## R2 buckets (created)

| Bucket | Purpose |
|--------|---------|
| zatra360-documents | Passports, visas, tickets, invoices, client docs |
| zatra360-assets | Tenant logos, public-ish assets |
| zatra360-tickets | Generated ticket PDFs |
| zatra360-backups | Database / audit backups |

R2 S3 endpoint: `https://29cb84c6f8d3d3652b453a529f2e06f9.r2.cloudflarestorage.com`

The API (`StorageService`) uses S3-compatible access. Generate an R2 API token
(R2 → Manage R2 API Tokens) and set on the API host:

```
R2_ENDPOINT=https://29cb84c6f8d3d3652b453a529f2e06f9.r2.cloudflarestorage.com
R2_REGION=auto
R2_ACCESS_KEY_ID=<r2-access-key>
R2_SECRET_ACCESS_KEY=<r2-secret-key>
R2_BUCKET=zatra360-documents
```

## Recreate buckets

```bash
bash infra/cloudflare/r2-setup.sh
```

## Frontend deploy (Pages)

Config: `infra/cloudflare/wrangler.web.toml` (project `zatra360-web`).

```bash
cd apps/web
npx wrangler pages deploy .next
```

## Pending / manual steps

- Add the `zatra360.com` zone to the account (DNS) if not already present.
- Create the R2 API token and store secrets on the API host (never in git).
- Point `api.zatra360.com` at the Node API host once deployed.
