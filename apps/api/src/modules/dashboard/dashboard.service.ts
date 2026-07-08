import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getTenantStats(tenantId: string, branchId?: string) {
    const branchFilter = branchId ? { branchId } : {};
    const [leadCount, clientCount, quotationCount, bookingCount, invoiceCount, recentAuditLogs] = await Promise.all([
      this.prisma.lead.count({ where: { tenantId, ...branchFilter, deletedAt: null } }),
      this.prisma.client.count({ where: { tenantId, ...branchFilter, deletedAt: null } }),
      this.prisma.quotation.count({ where: { tenantId, ...branchFilter, deletedAt: null } }),
      this.prisma.booking.count({ where: { tenantId, ...branchFilter, deletedAt: null } }),
      this.prisma.invoice.count({ where: { tenantId, ...branchFilter, deletedAt: null } }),
      this.prisma.auditLog.findMany({ where: { tenantId, ...branchFilter }, orderBy: { createdAt: 'desc' }, take: 10, include: { actor: { select: { id: true, firstName: true, lastName: true, email: true } } } }),
    ]);
    return { leads: { total: leadCount }, clients: { total: clientCount }, quotations: { total: quotationCount }, bookings: { total: bookingCount }, invoices: { total: invoiceCount }, recentActivity: recentAuditLogs };
  }

  async getPlatformStats() {
    const [activeTenants, totalUsers, platformAdmins, recentTenants] = await Promise.all([
      this.prisma.tenant.count({ where: { deletedAt: null, status: 'ACTIVE' } }),
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { deletedAt: null, isPlatformSuperAdmin: true } }),
      this.prisma.tenant.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, name: true, slug: true, status: true, createdAt: true, _count: { select: { users: true, branches: true } } } }),
    ]);
    return { activeTenants, totalUsers, platformAdmins, recentTenants };
  }
}
