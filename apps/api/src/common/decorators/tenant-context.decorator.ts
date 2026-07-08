import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantContext } from '../interceptors/tenant-context.interceptor';

export const TenantCtx = createParamDecorator(
  (data: keyof TenantContext | undefined, ctx: ExecutionContext): TenantContext | string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    const context = request.tenantContext as TenantContext;
    return data ? context?.[data] : context;
  },
);
