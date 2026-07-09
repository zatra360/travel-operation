import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NumberGeneratorService {
  constructor(private readonly prisma: PrismaService) {}

  async generateQuoteNumber(tenantId: string): Promise<string> {
    return this.generateNumber(tenantId, 'QTE', 'quotation', 'quoteNumber');
  }

  async generateBookingRef(tenantId: string): Promise<string> {
    return this.generateNumber(tenantId, 'BKG', 'booking', 'bookingRef');
  }

  async generateTicketNumber(tenantId: string): Promise<string> {
    return this.generateNumber(tenantId, 'TKT', 'ticket', 'ticketNumber');
  }

  async generateInvoiceNumber(tenantId: string): Promise<string> {
    return this.generateNumber(tenantId, 'INV', 'invoice', 'invoiceNumber');
  }

  async generateReceiptNumber(tenantId: string): Promise<string> {
    return this.generateNumber(tenantId, 'RCP', 'receipt', 'receiptNumber');
  }

  async generateExpenseNumber(tenantId: string): Promise<string> {
    return this.generateNumber(tenantId, 'EXP', 'expense', 'expenseNumber');
  }

  async generateEmployeeCode(tenantId: string): Promise<string> {
    return this.generateNumber(tenantId, 'EMP', 'employee', 'employeeCode');
  }

  async generateRefundNumber(tenantId: string): Promise<string> {
    return this.generateNumber(tenantId, 'REF', 'refundRequest', 'refundNumber');
  }

  async generateReissueNumber(tenantId: string): Promise<string> {
    return this.generateNumber(tenantId, 'REI', 'reissueRequest', 'reissueNumber');
  }

  async generateCancellationNumber(tenantId: string): Promise<string> {
    return this.generateNumber(tenantId, 'CAN', 'cancellationRequest', 'cancellationNumber');
  }

  async generateSalaryRunNumber(tenantId: string): Promise<string> {
    return this.generateNumber(tenantId, 'SAL', 'salaryRun', 'salaryRunNumber');
  }

  private async generateNumber(
    tenantId: string,
    prefix: string,
    table: string,
    field: string,
  ): Promise<string> {
    const timestamp = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const maxRetries = 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const suffix = Math.floor(Math.random() * 9000 + 1000);
      const candidate = `${prefix}-${timestamp}-${suffix}`;

      const exists = await (this.prisma as any)[table].findFirst({
        where: { tenantId, [field]: candidate },
        select: { id: true },
      });

      if (!exists) {
        return candidate;
      }
    }

    throw new InternalServerErrorException(
      `Failed to generate unique ${prefix} number after ${maxRetries} attempts`,
    );
  }
}
