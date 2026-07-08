import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required');
    }

    const membership = await this.prisma.userTenantMembership.findUnique({
      where: { userId_tenantId: { userId: user.id, tenantId } },
    });

    if (!membership || !membership.isActive) {
      throw new ForbiddenException('You do not have access to this tenant');
    }

    const branchId = request.headers['x-branch-id'] as string;
    if (branchId) {
      const branchMembership = await this.prisma.userBranchMembership.findUnique({
        where: { userId_branchId: { userId: user.id, branchId } },
      });
      if (!branchMembership || !branchMembership.isActive) {
        throw new ForbiddenException('You do not have access to this branch');
      }
    }

    request.tenantContext = { tenantId, branchId, userId: user.id };
    return true;
  }
}
