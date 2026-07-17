import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ImportService {
  constructor(private readonly prisma: PrismaService) {}

  parseCSV(buffer: Buffer): Record<string, string>[] {
    const text = buffer.toString('utf-8').trim();
    if (!text) throw new BadRequestException('Empty file');
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length < 2) throw new BadRequestException('File must have a header row and at least one data row');
    const headers = this.parseLine(lines[0]);
    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseLine(lines[i]);
      if (values.length === 0) continue;
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h.trim().toLowerCase()] = (values[idx] || '').trim(); });
      rows.push(row);
    }
    return rows;
  }

  private parseLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === ',' && !inQuotes) { result.push(current); current = ''; continue; }
      current += ch;
    }
    result.push(current);
    return result;
  }

  async importLeads(tenantId: string, branchId: string | undefined, rows: Record<string, string>[]) {
    let imported = 0;
    let skipped = 0;
    for (const row of rows) {
      if (!row.fullname && !row.full_name && !row.name) { skipped++; continue; }
      const name = (row.fullname || row.full_name || row.name || '').trim();
      if (!name) { skipped++; continue; }
      await this.prisma.lead.create({
        data: {
          tenantId, branchId: branchId || null,
          fullName: name,
          firstName: row.firstname || row.first_name || null,
          lastName: row.lastname || row.last_name || null,
          email: row.email || null,
          primaryMobile: row.phone || row.mobile || row.primarymobile || null,
          source: row.source || null,
          status: 'NEW',
        },
      });
      imported++;
    }
    return { imported, skipped, total: rows.length };
  }

  async importClients(tenantId: string, branchId: string | undefined, rows: Record<string, string>[]) {
    let imported = 0;
    let skipped = 0;
    for (const row of rows) {
      const name = (row.displayname || row.display_name || row.name || row.fullname || '').trim();
      if (!name) { skipped++; continue; }
      await this.prisma.client.create({
        data: {
          tenantId, branchId: branchId || null,
          displayName: name,
          email: row.email || null,
          phone: row.phone || row.mobile || null,
          companyName: row.company || row.companyname || null,
          type: row.type || 'PERSON',
          status: 'ACTIVE',
        },
      });
      imported++;
    }
    return { imported, skipped, total: rows.length };
  }

  async exportLeadsCSV(tenantId: string): Promise<string> {
    const leads = await this.prisma.lead.findMany({ where: { tenantId, deletedAt: null } });
    const headers = ['FullName', 'Email', 'Phone', 'Source', 'Status', 'CreatedAt'];
    const lines = [headers.join(',')];
    for (const l of leads) {
      lines.push([l.fullName, l.email || '', l.primaryMobile || '', l.source || '', l.status, l.createdAt.toISOString()].map(v => `"${v}"`).join(','));
    }
    return lines.join('\n');
  }

  async exportClientsCSV(tenantId: string): Promise<string> {
    const clients = await this.prisma.client.findMany({ where: { tenantId, deletedAt: null } });
    const headers = ['DisplayName', 'Email', 'Phone', 'Company', 'Type', 'Status', 'CreatedAt'];
    const lines = [headers.join(',')];
    for (const c of clients) {
      lines.push([c.displayName, c.email || '', c.phone || '', c.companyName || '', c.type, c.status, c.createdAt.toISOString()].map(v => `"${v}"`).join(','));
    }
    return lines.join('\n');
  }

  async exportBookingsCSV(tenantId: string): Promise<string> {
    const data = await this.prisma.booking.findMany({ where: { tenantId, deletedAt: null }, include: { client: { select: { displayName: true } } } });
    const headers = ['BookingRef', 'PNR', 'Status', 'Client', 'TravelStart', 'TravelEnd', 'CreatedAt'];
    const lines = [headers.join(',')];
    for (const r of data) {
      lines.push([r.bookingRef, r.pnrLocator || '', r.status, r.client?.displayName || '', r.travelStart?.toISOString() || '', r.travelEnd?.toISOString() || '', r.createdAt.toISOString()].map(v => `"${v}"`).join(','));
    }
    return lines.join('\n');
  }

  async exportInvoicesCSV(tenantId: string): Promise<string> {
    const data = await this.prisma.invoice.findMany({ where: { tenantId, deletedAt: null }, include: { client: { select: { displayName: true } } } });
    const headers = ['InvoiceNumber', 'Status', 'Client', 'Currency', 'Subtotal', 'Tax', 'Discount', 'Total', 'Paid', 'Due', 'DueDate', 'CreatedAt'];
    const lines = [headers.join(',')];
    for (const r of data) {
      lines.push([r.invoiceNumber, r.status, r.client?.displayName || '', r.currencyCode, String(r.subtotal), String(r.taxAmount), String(r.discountAmount), String(r.totalAmount), String(r.paidAmount), String(r.dueAmount), r.dueAt?.toISOString() || '', r.createdAt.toISOString()].map(v => `"${v}"`).join(','));
    }
    return lines.join('\n');
  }

  async exportPaymentsCSV(tenantId: string): Promise<string> {
    const data = await this.prisma.payment.findMany({ where: { tenantId } });
    const headers = ['Reference', 'Status', 'Amount', 'Currency', 'Method', 'InvoiceId', 'ReceivedAt', 'CreatedAt'];
    const lines = [headers.join(',')];
    for (const r of data) {
      lines.push([r.reference || '', r.status, String(r.amount), r.currencyCode, r.paymentMethod || '', r.invoiceId || '', r.receivedAt?.toISOString() || '', r.createdAt?.toISOString()].map(v => `"${v}"`).join(','));
    }
    return lines.join('\n');
  }

  async exportTicketsCSV(tenantId: string): Promise<string> {
    const data = await this.prisma.ticket.findMany({ where: { tenantId }, include: { booking: { select: { bookingRef: true } } } });
    const headers = ['TicketNumber', 'BookingRef', 'Passenger', 'Status', 'IssuedAt', 'CreatedAt'];
    const lines = [headers.join(',')];
    for (const r of data) {
      lines.push([r.ticketNumber, r.booking?.bookingRef || '', r.passengerName || '', r.status, r.issuedAt?.toISOString() || '', r.createdAt?.toISOString()].map(v => `"${v}"`).join(','));
    }
    return lines.join('\n');
  }

  async exportQuotationsCSV(tenantId: string): Promise<string> {
    const data = await this.prisma.quotation.findMany({ where: { tenantId, deletedAt: null }, include: { client: { select: { displayName: true } } } });
    const headers = ['QuoteNumber', 'Status', 'Client', 'Currency', 'Subtotal', 'Tax', 'Discount', 'GrandTotal', 'ValidUntil', 'CreatedAt'];
    const lines = [headers.join(',')];
    for (const r of data) {
      lines.push([r.quoteNumber, r.status, r.client?.displayName || '', r.currencyCode, String(r.subtotal), String(r.taxTotal), String(r.discountTotal), String(r.grandTotal), r.validUntil?.toISOString() || '', r.createdAt?.toISOString()].map(v => `"${v}"`).join(','));
    }
    return lines.join('\n');
  }

  async exportEmployeesCSV(tenantId: string): Promise<string> {
    const data = await this.prisma.employee.findMany({ where: { tenantId, deletedAt: null } });
    const headers = ['EmployeeCode', 'FirstName', 'LastName', 'Email', 'Phone', 'Position', 'Status', 'JoinedAt', 'CreatedAt'];
    const lines = [headers.join(',')];
    for (const r of data) {
      lines.push([r.employeeCode, r.firstName, r.lastName, r.email || '', r.phone || '', r.position || '', r.status, r.joinedAt?.toISOString() || '', r.createdAt?.toISOString()].map(v => `"${v}"`).join(','));
    }
    return lines.join('\n');
  }

  async exportExpensesCSV(tenantId: string): Promise<string> {
    const data = await this.prisma.expense.findMany({ where: { tenantId, deletedAt: null } });
    const headers = ['ExpenseNumber', 'Category', 'Vendor', 'Amount', 'Currency', 'Status', 'ExpenseDate', 'CreatedAt'];
    const lines = [headers.join(',')];
    for (const r of data) {
      lines.push([r.expenseNumber, r.category || '', r.vendorName || '', String(r.amount), r.currencyCode, r.status, r.expenseDate?.toISOString() || '', r.createdAt?.toISOString()].map(v => `"${v}"`).join(','));
    }
    return lines.join('\n');
  }
}
