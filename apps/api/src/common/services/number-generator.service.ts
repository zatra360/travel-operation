import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NumberGeneratorService {
  constructor(private readonly prisma: PrismaService) {}

  async generateQuoteNumber(tenantId: string): Promise<string> {
    const prefix = 'QTE';
    return this.generateNumber(tenantId, prefix, 'quotation', 'quoteNumber');
  }

  async generateBookingRef(tenantId: string): Promise<string> {
    const prefix = 'BKG';
    return this.generateNumber(tenantId, prefix, 'booking', 'bookingRef');
  }

  async generateTicketNumber(tenantId: string): Promise<string> {
    const prefix = 'TKT';
    return this.generateNumber(tenantId, prefix, 'ticket', 'ticketNumber');
  }

  async generateInvoiceNumber(tenantId: string): Promise<string> {
    const prefix = 'INV';
    return this.generateNumber(tenantId, prefix, 'invoice', 'invoiceNumber');
  }

  async generateReceiptNumber(tenantId: string): Promise<string> {
    const prefix = 'RCP';
    return this.generateNumber(tenantId, prefix, 'receipt', 'receiptNumber');
  }

  async generateExpenseNumber(tenantId: string): Promise<string> {
    const prefix = 'EXP';
    return this.generateNumber(tenantId, prefix, 'expense', 'expenseNumber');
  }

  async generateEmployeeCode(tenantId: string): Promise<string> {
    const prefix = 'EMP';
    return this.generateNumber(tenantId, prefix, 'employee', 'employeeCode');
  }

  async generateRefundNumber(tenantId: string): Promise<string> {
    const prefix = 'REF';
    return this.generateNumber(tenantId, prefix, 'refundRequest', 'refundNumber');
  }

  async generateReissueNumber(tenantId: string): Promise<string> {
    const prefix = 'REI';
    return this.generateNumber(tenantId, prefix, 'reissueRequest', 'reissueNumber');
  }

  async generateCancellationNumber(tenantId: string): Promise<string> {
    const prefix = 'CAN';
    return this.generateNumber(tenantId, prefix, 'cancellationRequest', 'cancellationNumber');
  }

  async generateSalaryRunNumber(tenantId: string): Promise<string> {
    const prefix = 'SAL';
    return this.generateNumber(tenantId, prefix, 'salaryRun', 'salaryRunNumber');
  }

  private async generateNumber(
    tenantId: string,
    prefix: string,
    table: string,
    field: string,
  ): Promise<string> {
    const timestamp = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 9000 + 1000);
    const candidate = `${prefix}-${timestamp}-${random}`;

    const exists = await (this.prisma as any)[table].findFirst({
      where: { tenantId, [field]: candidate },
    });

    if (exists) {
      const retry = Math.floor(Math.random() * 9000 + 1000);
      return `${prefix}-${timestamp}-${retry}`;
    }

    return candidate;
  }
}
