# API Checklist

Items that every controller method, every DTO, every response must
satisfy.

## NestJS controller

- [ ] `@Controller('tenant/<resource>')` with the right prefix.
- [ ] Every method carries `@RequirePermissions('<MODULE>_<VERB>')`.
- [ ] Query params parsed with `@Type(() => Number)` where
  numeric.
- [ ] Pagination `limit` constrained (`@Min(1) @Max(200)`).
- [ ] Static segments declared before `:id` wildcards.
- [ ] `@ApiTags`, `@ApiOperation`, `@ApiQuery`,
  `@ApiBearerAuth` for Swagger.

## DTO

- [ ] Whitelisted (`whitelist: true`).
- [ ] Strict (`forbidNonWhitelisted: true`).
- [ ] `class-validator` decorators on every field.
- [ ] `@Transform` for fields that need coercion.
- [ ] No `any` returned from the controller (typed response
  wrapper).

## Guard order

- [ ] Global `JwtAuthGuard` first.
- [ ] Then `TenantGuard`.
- [ ] Then `PermissionsGuard`.
- [ ] For SSE: `Public()` + `SseAuthGuard` instead.

## Tenant and branch context

- [ ] Every read scoped by `tenantId` from `req.tenantContext`.
- [ ] Every write scoped by `tenantId`.
- [ ] Cross-tenant record lookup fails closed.
- [ ] `branchId` from `req.tenantContext` honoured where the
  entity is branch-scoped.

## Response envelope

- [ ] Success: `{success: true, data, page?, totalPages?, total?,
  limit?, timestamp}`.
- [ ] Error: `{success: false, statusCode, message, timestamp}`.
- [ ] `message` always a non-empty string
  (normalised in `HttpExceptionFilter`).
- [ ] Validation errors joined with `;` (array → string).

## SSE

- [ ] `Accept: text/event-stream` bypasses the success-wrapper
  interceptor.
- [ ] `Content-Type: text/event-stream` header explicit.
- [ ] `Cache-Control: no-cache, no-transform`.
- [ ] Heartbeat on a cadence that survives proxy idle timeouts.
- [ ] Multi-instance fan-out documented or noted for
  follow-up.

## Rate limiting

- [ ] Auth routes throttled (login, refresh, password reset).
- [ ] Expensive read routes throttled (export, search).
- [ ] Bulk action routes throttled per record count.

## Audit and timeline

- [ ] Every create: `audit_logs` row with `action =
  '<MODULE>_CREATED'` + `activity_logs` row.
- [ ] Every update: `audit_logs` row with `action =
  '<MODULE>_UPDATED'` + diff payload + `activity_logs` row.
- [ ] Every soft-delete: `audit_logs` row with `action =
  '<MODULE>_DELETED'` + `activity_logs` row.
- [ ] No hard-delete of `audit_logs`.

## Idempotency

- [ ] Mutating endpoints accept an `Idempotency-Key` header
  where the action could be repeated accidentally.
- [ ] Same key returns same response within window.

## Documentation

- [ ] Swagger doc complete with example payload and response.
- [ ] Permission documented at the controller level.
