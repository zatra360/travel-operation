import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getFinanceReport(tenantId: string) {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d.toLocaleString('en', { month: 'short', year: '2-digit' }));
    }

    const invoices = await this.prisma.invoice.findMany({
      where: { tenantId, deletedAt: null, createdAt: { gte: sixMonthsAgo } },
      select: { totalAmount: true, createdAt: true, status: true },
    });
    const expenses = await this.prisma.expense.findMany({
      where: { tenantId, deletedAt: null, expenseDate: { gte: sixMonthsAgo } },
      select: { amount: true, expenseDate: true },
    });

    const data = months.map((month, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const next = new Date(now.getFullYear(), now.getMonth() - 4 + i, 1);
      const invTotal = invoices.filter(p => new Date(p.createdAt) >= d && new Date(p.createdAt) < next && p.status !== 'CANCELLED')
        .reduce((s, p) => s + Number(p.totalAmount), 0);
      const expTotal = expenses.filter(e => new Date(e.expenseDate!) >= d && new Date(e.expenseDate!) < next)
        .reduce((s, e) => s + Number(e.amount), 0);
      return { month, revenue: Math.round(invTotal * 100) / 100, expenses: Math.round(expTotal * 100) / 100, profit: Math.round((invTotal - expTotal) * 100) / 100 };
    });

    const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);
    const totalExpenses = data.reduce((s, d) => s + d.expenses, 0);
    const paidInvoices = invoices.filter(i => i.status === 'PAID').length;
    const unpaidInvoices = invoices.filter(i => i.status !== 'PAID' && i.status !== 'CANCELLED').length;

    return { data, summary: { totalRevenue, totalExpenses, profit: totalRevenue - totalExpenses, paidInvoices, unpaidInvoices } };
  }

  async getSalesReport(tenantId: string) {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [thisMonthInvoices, lastMonthInvoices, allQuotations, allBookings, leadsWon] = await Promise.all([
      this.prisma.invoice.findMany({ where: { tenantId, deletedAt: null, createdAt: { gte: thisMonth } }, select: { totalAmount: true } }),
      this.prisma.invoice.findMany({ where: { tenantId, deletedAt: null, createdAt: { gte: lastMonth, lt: thisMonth } }, select: { totalAmount: true } }),
      this.prisma.quotation.count({ where: { tenantId, deletedAt: null, status: 'ACCEPTED' } }),
      this.prisma.booking.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.lead.count({ where: { tenantId, deletedAt: null, status: 'WON' } }),
    ]);

    const thisMonthTotal = thisMonthInvoices.reduce((s, i) => s + Number(i.totalAmount), 0);
    const lastMonthTotal = lastMonthInvoices.reduce((s, i) => s + Number(i.totalAmount), 0);
    const growth = lastMonthTotal > 0 ? Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100) : 0;

    const pipeline = [
      { name: 'Leads', value: await this.prisma.lead.count({ where: { tenantId, deletedAt: null } }) },
      { name: 'Won', value: leadsWon },
      { name: 'Quotations', value: await this.prisma.quotation.count({ where: { tenantId, deletedAt: null } }) },
      { name: 'Accepted', value: allQuotations },
      { name: 'Bookings', value: allBookings },
    ];

    return { thisMonth: thisMonthTotal, lastMonth: lastMonthTotal, growth, pipeline };
  }

  async getLeadReport(tenantId: string) {
    const leads = await this.prisma.lead.findMany({
      where: { tenantId, deletedAt: null },
      select: { source: true, status: true },
    });
    const total = leads.length;
    const bySource: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    leads.forEach(l => {
      const src = l.source || 'Unknown';
      bySource[src] = (bySource[src] || 0) + 1;
      byStatus[l.status] = (byStatus[l.status] || 0) + 1;
    });
    const sourceData = Object.entries(bySource).map(([name, value]) => ({ name, value }));
    const statusData = Object.entries(byStatus).map(([name, value]) => ({ name, value }));
    const conversionRate = total > 0 ? Math.round((byStatus['WON'] || 0) / total * 100) : 0;
    return { total, conversionRate, sourceData, statusData };
  }

  async getAttendanceReport(tenantId: string) {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const attendances = await this.prisma.attendance.findMany({
      where: { tenantId, createdAt: { gte: thisMonth } },
      select: { status: true, clockIn: true },
    });
    const total = attendances.length;
    const present = attendances.filter(a => a.status === 'PRESENT').length;
    const absent = attendances.filter(a => a.status === 'ABSENT').length;
    const late = attendances.filter(a => a.status === 'LATE').length;
    const halfDay = attendances.filter(a => a.status === 'HALF_DAY').length;
    return { total, present, absent, late, halfDay, attendanceRate: total > 0 ? Math.round((present / total) * 100) : 0 };
  }

  async getTaxReport(tenantId: string) {
    const now = new Date();
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d.toLocaleString('en', { month: 'short' }));
    }
    const invoices = await this.prisma.invoice.findMany({
      where: { tenantId, deletedAt: null, createdAt: { gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) }, status: { not: 'CANCELLED' } },
      select: { taxAmount: true, createdAt: true },
    });
    const data = months.map((month, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const next = new Date(now.getFullYear(), now.getMonth() - 4 + i, 1);
      const tax = invoices.filter(p => new Date(p.createdAt) >= d && new Date(p.createdAt) < next)
        .reduce((s, p) => s + Number(p.taxAmount), 0);
      return { month, tax: Math.round(tax * 100) / 100 };
    });
    const totalTax = data.reduce((s, d) => s + d.tax, 0);
    return { data, totalTax };
  }
}
