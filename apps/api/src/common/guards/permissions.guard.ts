import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions?.length) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const tenantContext = request.tenantContext;

    if (!user) return false;

    if (user.isPlatformSuperAdmin) return true;

    if (!tenantContext) return false;

    // Tenant Owner / Admin can do everything inside their company.
    const membership = await this.prisma.userTenantMembership.findUnique({
      where: { userId_tenantId: { userId: user.id, tenantId: tenantContext.tenantId } },
      select: { role: true },
    });
    if (membership?.role === 'OWNER' || membership?.role === 'ADMIN') return true;

    const roles = await this.prisma.userRoleAssignment.findMany({
      where: {
        userId: user.id,
        tenantId: tenantContext.tenantId,
        ...(tenantContext.branchId ? { branchId: tenantContext.branchId } : {}),
      },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    const userPermissions = new Set<string>();
    for (const assignment of roles) {
      for (const rp of assignment.role.permissions) {
        userPermissions.add(rp.permission.name);
      }
    }

    return requiredPermissions.every((perm) => userPermissions.has(perm));
  }
}
