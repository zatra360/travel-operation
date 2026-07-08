import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../../modules/audit/audit.service';
import { AuditAction } from '@prisma/client';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const user = request.user;
    const tenantContext = request.tenantContext;

    if (!user || !tenantContext?.tenantId) {
      return next.handle();
    }

    const actionMap: Record<string, AuditAction> = {
      POST: 'CREATE',
      PUT: 'UPDATE',
      PATCH: 'UPDATE',
      DELETE: 'DELETE',
    };

    const action = actionMap[method];
    if (!action) return next.handle();

    const module = request.route?.path?.split('/')[3]?.toUpperCase() || 'UNKNOWN';
    const entity = request.route?.path?.split('/')[4] || 'UNKNOWN';
    const entityId = request.params?.id;

    return next.handle().pipe(
      tap(() => {
        this.auditService.logMutation(
          user.id,
          tenantContext.tenantId,
          module,
          entity,
          entityId || 'unknown',
          action,
          { method, path: request.route?.path },
          tenantContext.branchId,
        ).catch((err) => console.error('Audit log failed:', err));
      }),
    );
  }
}
