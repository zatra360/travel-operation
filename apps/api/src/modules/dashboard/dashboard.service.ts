import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getTenantStats(tenantId: string, branchId?: string) {
    const branchFilter = branchId ? { branchId } : {};

    const [
      leadTotal, leadNew, leadWon,
      leadSlaBreached,
      leadContacted, leadQualified, leadQuotationSent, leadNegotiation, leadLost,
      clientTotal, clientActive,
      quotationTotal, quotationPending,
      bookingTotal, bookingHeld, bookingConfirmed, bookingTicketed,
      invoiceTotal, invoiceUnpaid, invoiceOverdue,
      ticketTotal, ticketPending, ticketIssued,
      refundTotal, refundPending,
      employeeTotal, employeeActive,
      recentActivity,
      revenueData,
    ] = await Promise.all([
      this.prisma.lead.count({ where: { tenantId, ...branchFilter, deletedAt: null } }),
      this.prisma.lead.count({ where: { tenantId, ...branchFilter, deletedAt: null, status: 'NEW' } }),
      this.prisma.lead.count({ where: { tenantId, ...branchFilter, deletedAt: null, status: 'WON' } }),
      this.prisma.lead.count({ where: { tenantId, ...branchFilter, deletedAt: null, slaDueAt: { lt: new Date() }, status: { notIn: ['WON', 'LOST', 'DUPLICATE', 'SPAM'] } } }),
      this.prisma.lead.count({ where: { tenantId, ...branchFilter, deletedAt: null, status: 'CONTACTED' } }),
      this.prisma.lead.count({ where: { tenantId, ...branchFilter, deletedAt: null, status: 'QUALIFIED' } }),
      this.prisma.lead.count({ where: { tenantId, ...branchFilter, deletedAt: null, status: 'QUOTATION_SENT' } }),
      this.prisma.lead.count({ where: { tenantId, ...branchFilter, deletedAt: null, status: 'NEGOTIATION' } }),
      this.prisma.lead.count({ where: { tenantId, ...branchFilter, deletedAt: null, status: 'LOST' } }),

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

      this.getMonthlyRevenue(tenantId, branchId),
    ]);

    return {
      leads: { total: leadTotal, new: leadNew, won: leadWon, slaBreached: leadSlaBreached },
      leadPipeline: [
        { stage: 'NEW', count: leadNew },
        { stage: 'CONTACTED', count: leadContacted },
        { stage: 'QUALIFIED', count: leadQualified },
        { stage: 'QUOTATION_SENT', count: leadQuotationSent },
        { stage: 'NEGOTIATION', count: leadNegotiation },
        { stage: 'WON', count: leadWon },
        { stage: 'LOST', count: leadLost },
      ],
      clients: { total: clientTotal, active: clientActive },
      quotations: { total: quotationPending > 0 ? quotationTotal : quotationTotal, pending: quotationPending },
      bookings: { total: bookingTotal, held: bookingHeld, confirmed: bookingConfirmed, ticketed: bookingTicketed },
      invoices: { total: invoiceTotal, unpaid: invoiceUnpaid, overdue: invoiceOverdue },
      tickets: { total: ticketTotal, pending: ticketPending, issued: ticketIssued },
      refunds: { total: refundTotal, pending: refundPending },
      employees: { total: employeeTotal, active: employeeActive },
      recentActivity,
      revenue: revenueData,
    };
  }

  private async getMonthlyRevenue(tenantId: string, branchId?: string) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        deletedAt: null,
        createdAt: { gte: sixMonthsAgo },
        ...(branchId ? { branchId } : {}),
      },
      select: { totalAmount: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const months: { name: string; revenue: number; count: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(sixMonthsAgo);
      d.setMonth(d.getMonth() + i);
      const label = d.toLocaleDateString('en-US', { month: 'short' });
      months.push({ name: label, revenue: 0, count: 0 });
    }

    invoices.forEach(inv => {
      const d = new Date(inv.createdAt);
      const idx = (d.getFullYear() - sixMonthsAgo.getFullYear()) * 12 + (d.getMonth() - sixMonthsAgo.getMonth());
      if (idx >= 0 && idx < 6) {
        months[idx].revenue += Number(inv.totalAmount);
        months[idx].count += 1;
      }
    });

    return { monthly: months, totalRevenue: months.reduce((s, m) => s + m.revenue, 0), totalInvoices: invoices.length };
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

  async getExpiries(tenantId: string) {
    const now = new Date();
    const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [passports, visas, contracts, quotations] = await Promise.all([
      this.prisma.clientPassport.findMany({
        where: { tenantId, isActive: true, expiryDate: { lte: in90Days, gte: now } },
        include: { client: { select: { id: true, displayName: true } } },
        orderBy: { expiryDate: 'asc' },
        take: 20,
      }),
      this.prisma.clientVisa.findMany({
        where: { tenantId, isActive: true, expiryDate: { lte: in90Days, gte: now } },
        include: { client: { select: { id: true, displayName: true } }, country: { select: { id: true, name: true } } },
        orderBy: { expiryDate: 'asc' },
        take: 20,
      }),
      this.prisma.contract.findMany({
        where: { tenantId, deletedAt: null, status: 'ACTIVE', endDate: { lte: in30Days } },
        include: { client: { select: { id: true, displayName: true } } },
        orderBy: { endDate: 'asc' },
        take: 20,
      }),
      this.prisma.quotation.findMany({
        where: { tenantId, deletedAt: null, status: 'SENT', validUntil: { lte: in30Days, gte: now } },
        orderBy: { validUntil: 'asc' },
        take: 20,
      }),
    ]);

    return {
      passports: passports.map((p) => ({ id: p.id, passportNumber: p.passportNumber, fullName: p.fullName, expiryDate: p.expiryDate, client: p.client })),
      visas: visas.map((v) => ({ id: v.id, visaType: v.visaType, visaNumber: v.visaNumber, expiryDate: v.expiryDate, country: v.country, client: v.client })),
      contracts: contracts.map((c) => ({ id: c.id, contractNumber: c.contractNumber, subject: c.subject, endDate: c.endDate, client: c.client })),
      expiringQuotations: quotations,
    };
  }

  async getPerformanceMetrics(tenantId: string) {
    const employees = await this.prisma.employee.findMany({
      where: { tenantId, deletedAt: null },
      select: {
        id: true, firstName: true, lastName: true, employeeCode: true, position: true,
        department: { select: { name: true } },
        commissions: { where: { status: { not: 'REJECTED' } }, select: { amount: true, status: true } },
        _count: { select: { leaves: true, attendances: true } },
      },
      take: 50,
    });

    const [
      bookingsByUser, leadCounts, quotationCounts,
    ] = await Promise.all([
      this.prisma.booking.groupBy({
        by: ['assignedToId'],
        where: { tenantId, deletedAt: null },
        _count: true,
      }),
      this.prisma.lead.groupBy({
        by: ['assignedToId'],
        where: { tenantId, deletedAt: null, status: 'WON' },
        _count: true,
      }),
      this.prisma.quotation.groupBy({
        by: ['assignedToId'],
        where: { tenantId, deletedAt: null, status: 'ACCEPTED' },
        _count: true,
      }),
    ]);

    const userMetrics = new Map<string, { bookings: number; leadsWon: number; quotesAccepted: number }>();
    bookingsByUser.forEach(b => { const m = userMetrics.get(b.assignedToId!) || { bookings: 0, leadsWon: 0, quotesAccepted: 0 }; m.bookings = b._count; userMetrics.set(b.assignedToId!, m); });
    leadCounts.forEach(l => { const m = userMetrics.get(l.assignedToId!) || { bookings: 0, leadsWon: 0, quotesAccepted: 0 }; m.leadsWon = l._count; userMetrics.set(l.assignedToId!, m); });
    quotationCounts.forEach(q => { const m = userMetrics.get(q.assignedToId!) || { bookings: 0, leadsWon: 0, quotesAccepted: 0 }; m.quotesAccepted = q._count; userMetrics.set(q.assignedToId!, m); });

    return employees.map(e => {
      const metrics = userMetrics.get(e.id) || { bookings: 0, leadsWon: 0, quotesAccepted: 0 };
      const commissionTotal = e.commissions.filter(c => c.status === 'PAID').reduce((s, c) => s + Number(c.amount), 0);
      const commissionPending = e.commissions.filter(c => c.status === 'PENDING' || c.status === 'APPROVED').reduce((s, c) => s + Number(c.amount), 0);
      return {
        id: e.id, firstName: e.firstName, lastName: e.lastName, employeeCode: e.employeeCode,
        position: e.position, department: e.department?.name,
        bookings: metrics.bookings, leadsWon: metrics.leadsWon, quotesAccepted: metrics.quotesAccepted,
        commissionTotal, commissionPending,
        leaves: e._count.leaves, attendances: e._count.attendances,
      };
    });
  }
}
