# Security Overview

## Authentication

- JWT-based authentication using `@nestjs/jwt` and `passport-jwt`
- Tokens expire after configurable duration (default: 24 hours)
- Passwords hashed with bcrypt (12 rounds)
- Public routes: login, password reset, health check

## Authorization (RBAC)

### Permission Model
Permissions follow a module+action naming convention: `{MODULE}_{ACTION}`

Example: `LEAD_CREATE`, `INVOICE_READ`, `BOOKING_UPDATE`

### Role Types
- **System roles**: Created by seed, marked with `isSystem: true`
- **Custom roles**: Created by tenant admins

### Access Control Flow
1. Request arrives with JWT token
2. `JwtAuthGuard` validates token and extracts user
3. `TenantContextInterceptor` resolves tenant/branch from headers
4. `PermissionsGuard` checks required permissions against user's role assignments
5. Platform super admins bypass permission checks

## Tenant Isolation

- Every tenant-scoped route requires `X-Tenant-Id` header
- Backend validates user membership in the requested tenant
- All queries filter by `tenantId`
- Branch-scoped operations additionally require branch membership

## Data Protection

- Soft deletes preserve data (no hard deletes on business data)
- Audit logs immutable (write-only append)
- Passwords never returned in API responses
- Sensitive fields excluded from query selections

## API Security

- Rate limiting via `@nestjs/throttler` (100 requests/minute by default)
- CORS configured for specific origins
- Input validation via `class-validator` with whitelist mode
- Swagger docs in development only (configurable for production)

## Deployment Security

- JWT secret must be a strong random value in production
- Database connections use SSL in production (Neon default)
- Cloudflare WAF for DDoS protection
- R2 storage with signed URLs for document access
- Environment-specific secrets management
