# API_RULES

Applies to `apps/api` (NestJS). Read before adding/changing any endpoint.

## Base + grouping

- Global prefix: `/api/v1` (set in `main.ts`).
- Swagger UI: `/api/v1/docs`.
- Route groups (controller path prefixes):
  - `public/*` — no auth, no tenant (login, refresh, forgot/reset, intake, metadata)
  - `platform/*` — auth + platform permission, no tenant required
  - `tenant/*` — auth + tenant context + RBAC

Current tenant controllers: `tenant/branches`, `tenant/users`, `tenant/roles`,
`tenant/audit-logs`, `tenant/settings`, `tenant/dashboard`, `tenant/leads`,
`tenant/clients`, `tenant/follow-ups`. Platform: `platform/tenants`,
`platform/users`, `platform/permissions`.

## Response envelope

Success (produced by `TransformInterceptor`):

```json
{ "success": true, "data": {}, "timestamp": "ISO-8601" }
```

Error (produced by `AllExceptionsFilter` / `HttpExceptionFilter`):

```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "fields": {} }, "timestamp": "ISO-8601" }
```

**Target upgrade (planned, do not break existing):** add `meta` (pagination) and
`traceId` to both envelopes. When implementing, extend the interceptor/filter —
do not hand-roll per controller.

List endpoints return the inner payload:

```json
{ "data": [], "total": 0, "page": 1, "limit": 50, "totalPages": 0 }
```

## Mandatory per endpoint

1. **DTO validation** — every body/query uses a class-validator DTO. Global
   `ValidationPipe` runs with `whitelist: true`, `forbidNonWhitelisted: true`,
   `transform: true`. Never accept raw `any` bodies.
2. **Guards** in order: `JwtAuthGuard`, then `TenantGuard` (tenant routes), then
   `PermissionsGuard`. Apply at controller level with `@UseGuards(...)`.
3. **Permission** — annotate handlers with `@RequirePermissions('MODULE_ACTION')`.
4. **Tenant context** — read via `@TenantCtx() ctx` (`ctx.tenantId`, `ctx.branchId`,
   `ctx.userId`). Never read `tenantId` from the body for scoping.
5. **Audit** — every mutation (create/update/delete/sensitive) calls
   `AuditService.logMutation(...)`. See `SECURITY_RULES.md`.
6. **Swagger** — `@ApiTags`, `@ApiBearerAuth`, `@ApiOperation` on each handler.

## Lists

- Extend `PaginationDto` (`page` default 1, `limit` default 50, max 100).
- Support `search` where useful (case-insensitive `contains` across key fields).
- Support relevant `filter` fields (status, type, assignee, branch).
- Never return `deletedAt != null` rows by default.
- Never allow cross-tenant reads — always `where: { tenantId, ... }`.

## Controller → Service → Prisma

- Controllers: thin. Parse context/DTO, delegate to service.
- Services: business logic, Prisma access, audit calls, throw Nest exceptions
  (`NotFoundException`, `ConflictException`, `ForbiddenException`).
- Do not put Prisma queries in controllers.

## Reference skeleton

```ts
@ApiTags('Tenant - Leads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/leads')
export class LeadController {
  @Post()
  @RequirePermissions('LEAD_CREATE')
  @ApiOperation({ summary: 'Create a new lead' })
  create(@TenantCtx() ctx: TenantContext, @Body() dto: CreateLeadDto) {
    return this.service.create(ctx.tenantId, ctx.userId, dto);
  }
}
```

## Do NOT

- Return another tenant's data or ignore `tenantId`.
- Expose sensitive fields by default (see `SECURITY_RULES.md`).
- Add routes without a permission.
- Add mutations without an audit log.
- Leak raw stack traces in production error responses.
