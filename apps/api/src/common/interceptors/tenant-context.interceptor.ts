import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';

export interface TenantContext {
  tenantId: string;
  branchId?: string;
  userId: string;
}

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest();

    if (request.user) {
      const userId = request.user.sub || request.user.id;
      const tenantId = request.headers['x-tenant-id'] as string;

      if (tenantId) {
        const membership = await this.prisma.userTenantMembership.findUnique({
          where: {
            userId_tenantId: { userId, tenantId },
          },
        });

        if (!membership || !membership.isActive) {
          throw new ForbiddenException('You do not have access to this tenant');
        }

        const branchId = request.headers['x-branch-id'] as string;

        if (branchId) {
          const branchMembership = await this.prisma.userBranchMembership.findUnique({
            where: {
              userId_branchId: { userId, branchId },
            },
          });

          if (!branchMembership || !branchMembership.isActive) {
            throw new ForbiddenException('You do not have access to this branch');
          }
        }

        request.tenantContext = {
          tenantId,
          branchId,
          userId,
        } as TenantContext;
      }

      if (request.user.isPlatformSuperAdmin) {
        request.tenantContext = {
          ...request.tenantContext,
          userId,
          isPlatformSuperAdmin: true,
        };
      }
    }

    return next.handle();
  }
}
