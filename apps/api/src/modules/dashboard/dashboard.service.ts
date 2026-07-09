import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getTenantStats(tenantId: string, branchId?: string) {
    const branchFilter = branchId ? { branchId } : {};
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      leadTotal, leadNew, leadWon,
      clientTotal, clientActive,
      quotationTotal, quotationPending,
      bookingTotal, bookingHeld, bookingConfirmed, bookingTicketed,
      invoiceTotal, invoiceUnpaid, invoiceOverdue,
      ticketTotal, ticketPending, ticketIssued,
      refundTotal, refundPending,
      employeeTotal, employeeActive,
      recentActivity,
    ] = await Promise.all([
      this.prisma.lead.count({ where: { tenantId, ...branchFilter, deletedAt: null } }),
      this.prisma.lead.count({ where: { tenantId, ...branchFilter, deletedAt: null, status: 'NEW' } }),
      this.prisma.lead.count({ where: { tenantId, ...branchFilter, deletedAt: null, status: 'WON' } }),

      this.prisma.client.count({ where: { tenantId, ...branchFilter, deletedAt: null } }),
      this.prisma.client.count({ where: { tenantId, ...branchFilter, deletedAt: null, status: 'ACTIVE' } }),

      this.prisma.quotation.count({ where: { tenantId, ...branchFilter, deletedAt: null } }),
      this.prisma.quotation.count({ where: { tenantId, ...branchFilter, deletedAt: null, status: 'SENT' } }),

      this.prisma.booking.count({ where: { tenantId, ...branchFilter, deletedAt: null } }),
      this.prisma.booking.count({ where: { tenantId, ...branchFilter, deletedAt: null, status: 'HELD' } }),
      this.prisma.booking.count({ where: { tenantId, ...branchFilter, deletedAt: null, status: 'CONFIRMED' } }),
      this.prisma.booking.count({ where: { tenantId, ...branchFilter, deletedAt: null, status: 'TICKETED' } }),

      this.prisma.invoice.count({ where: { tenantId, ...branchFilter, deletedAt: null } }),
      this.prisma.invoice.count({ where: { tenantId, ...branchFilter, deletedAt: null, status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] } } }),
      this.prisma.invoice.count({ where: { tenantId, ...branchFilter, deletedAt: null, status: 'OVERDUE' } }),

      this.prisma.ticket.count({ where: { tenantId, ...branchFilter } }),
      this.prisma.ticket.count({ where: { tenantId, ...branchFilter, status: 'PENDING' } }),
      this.prisma.ticket.count({ where: { tenantId, ...branchFilter, status: 'ISSUED' } }),

      this.prisma.refundRequest.count({ where: { tenantId, ...branchFilter } }),
      this.prisma.refundRequest.count({ where: { tenantId, ...branchFilter, status: { in: ['REQUESTED', 'UNDER_REVIEW'] } } }),

      this.prisma.employee.count({ where: { tenantId, ...branchFilter, deletedAt: null } }),
      this.prisma.employee.count({ where: { tenantId, ...branchFilter, deletedAt: null, status: 'ACTIVE' } }),

      this.prisma.activity.findMany({
        where: { tenantId, ...(branchFilter.branchId ? { branchId: branchFilter.branchId } : {}) },
        orderBy: { createdAt: 'desc' },
        take: 15,
      }),
    ]);

    return {
      leads: { total: leadTotal, new: leadNew, won: leadWon },
      clients: { total: clientTotal, active: clientActive },
      quotations: { total: quotationTotal, pending: quotationPending },
      bookings: { total: bookingTotal, held: bookingHeld, confirmed: bookingConfirmed, ticketed: bookingTicketed },
      invoices: { total: invoiceTotal, unpaid: invoiceUnpaid, overdue: invoiceOverdue },
      tickets: { total: ticketTotal, pending: ticketPending, issued: ticketIssued },
      refunds: { total: refundTotal, pending: refundPending },
      employees: { total: employeeTotal, active: employeeActive },
      recentActivity,
    };
  }

  async getPlatformStats() {
    const [activeTenants, totalUsers, platformAdmins, recentTenants] = await Promise.all([
      this.prisma.tenant.count({ where: { deletedAt: null, status: 'ACTIVE' } }),
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { deletedAt: null, isPlatformSuperAdmin: true } }),
      this.prisma.tenant.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, name: true, slug: true, status: true, createdAt: true, _count: { select: { users: true, branches: true } } },
      }),
    ]);
    return { activeTenants, totalUsers, platformAdmins, recentTenants };
  }
}
