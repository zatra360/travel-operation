import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const MODULE_ROUTE_MAP: Record<string, string> = {
  'leads': 'lead',
  'clients': 'client',
  'client': 'client',
  'quotations': 'quotation',
  'quotation': 'quotation',
  'bookings': 'booking',
  'booking': 'booking',
  'tickets': 'ticket',
  'ticket': 'ticket',
  'invoices': 'invoice',
  'invoice': 'invoice',
  'payments': 'payment',
  'payment': 'payment',
  'expenses': 'expense',
  'expense': 'expense',
  'employees': 'employee',
  'employee': 'employee',
  'attendance': 'attendance',
  'service-cases': 'service_case',
  'service-case': 'service_case',
};

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

    const isSuperAdmin = user.isPlatformSuperAdmin;
    const membership = await this.prisma.userTenantMembership.findUnique({
      where: { userId_tenantId: { userId: user.id, tenantId } },
    });

    if (!isSuperAdmin && (!membership || !membership.isActive)) {
      throw new ForbiddenException('You do not have access to this tenant');
    }

    const branchId = request.headers['x-branch-id'] as string;
    if (branchId) {
      const branchMembership = await this.prisma.userBranchMembership.findUnique({
        where: { userId_branchId: { userId: user.id, branchId } },
      });
      const isTenantAdmin = membership?.role === 'OWNER' || membership?.role === 'ADMIN';
      if (!isSuperAdmin && !isTenantAdmin && (!branchMembership || !branchMembership.isActive)) {
        throw new ForbiddenException('You do not have access to this branch');
      }
    }

    if (isSuperAdmin && !membership) {
      await this.prisma.auditLog.create({
        data: {
          tenantId,
          actorId: user.id,
          action: 'IMPERSONATE',
          module: 'AUTH',
          entity: 'Tenant',
          entityId: tenantId,
          metadata: { email: user.email, ip: request.ip },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] as string,
        },
      }).catch(() => {});
    }

    const path = request.route?.path || request.url || '';
    const pathParts = path.replace(/^\/api\/v1\/tenant\//, '').split('/');
    const routePrefix = pathParts[0];
    const moduleKey = MODULE_ROUTE_MAP[routePrefix];

    if (moduleKey && !isSuperAdmin && membership?.role !== 'OWNER' && membership?.role !== 'ADMIN') {
      const setting = await this.prisma.tenantSetting.findUnique({
        where: { tenantId_key: { tenantId, key: `modules.${moduleKey}` } },
      });
      if (setting?.value === false) {
        throw new ForbiddenException(`The ${moduleKey.replace('_', ' ')} module has been disabled by your administrator`);
      }
    }

    request.tenantContext = { tenantId, branchId, userId: user.id, isPlatformSuperAdmin: isSuperAdmin };
    return true;
  }
}
