import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { randomInt } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

type NumberTable = 'booking' | 'employee' | 'expense' | 'invoice' | 'quotation' | 'receipt' | 'refundRequest' | 'reissueRequest' | 'cancellationRequest' | 'salaryRun' | 'ticket';

const TABLE_ACCESSORS: Record<string, { table: NumberTable; field: string }> = {
  quotation:         { table: 'quotation',         field: 'quoteNumber' },
  booking:           { table: 'booking',           field: 'bookingRef' },
  ticket:            { table: 'ticket',            field: 'ticketNumber' },
  invoice:           { table: 'invoice',           field: 'invoiceNumber' },
  receipt:           { table: 'receipt',           field: 'receiptNumber' },
  expense:           { table: 'expense',           field: 'expenseNumber' },
  employee:          { table: 'employee',          field: 'employeeCode' },
  refundRequest:     { table: 'refundRequest',     field: 'refundNumber' },
  reissueRequest:    { table: 'reissueRequest',    field: 'reissueNumber' },
  cancellationRequest: { table: 'cancellationRequest', field: 'cancellationNumber' },
  salaryRun:         { table: 'salaryRun',         field: 'salaryRunNumber' },
};

@Injectable()
export class NumberGeneratorService {
  constructor(private readonly prisma: PrismaService) {}

  async generateQuoteNumber(tenantId: string): Promise<string> {
    return this.generateNumber(tenantId, 'QTE', TABLE_ACCESSORS.quotation);
  }

  async generateBookingRef(tenantId: string): Promise<string> {
    return this.generateNumber(tenantId, 'BKG', TABLE_ACCESSORS.booking);
  }

  async generateTicketNumber(tenantId: string): Promise<string> {
    return this.generateNumber(tenantId, 'TKT', TABLE_ACCESSORS.ticket);
  }

  async generateInvoiceNumber(tenantId: string): Promise<string> {
    return this.generateNumber(tenantId, 'INV', TABLE_ACCESSORS.invoice);
  }

  async generateReceiptNumber(tenantId: string): Promise<string> {
    return this.generateNumber(tenantId, 'RCP', TABLE_ACCESSORS.receipt);
  }

  async generateExpenseNumber(tenantId: string): Promise<string> {
    return this.generateNumber(tenantId, 'EXP', TABLE_ACCESSORS.expense);
  }

  async generateEmployeeCode(tenantId: string): Promise<string> {
    return this.generateNumber(tenantId, 'EMP', TABLE_ACCESSORS.employee);
  }

  async generateRefundNumber(tenantId: string): Promise<string> {
    return this.generateNumber(tenantId, 'REF', TABLE_ACCESSORS.refundRequest);
  }

  async generateReissueNumber(tenantId: string): Promise<string> {
    return this.generateNumber(tenantId, 'REI', TABLE_ACCESSORS.reissueRequest);
  }

  async generateCancellationNumber(tenantId: string): Promise<string> {
    return this.generateNumber(tenantId, 'CAN', TABLE_ACCESSORS.cancellationRequest);
  }

  async generateSalaryRunNumber(tenantId: string): Promise<string> {
    return this.generateNumber(tenantId, 'SAL', TABLE_ACCESSORS.salaryRun);
  }

  private async generateNumber(
    tenantId: string,
    prefix: string,
    accessor: { table: NumberTable; field: string },
  ): Promise<string> {
    const timestamp = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const maxRetries = 5;
    const { table, field } = accessor;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const suffix = randomInt(100000, 999999);
      const candidate = `${prefix}-${timestamp}-${suffix}`;

      // Access Prisma model dynamically — valid at runtime because table is constrained
      // by the typed accessor map; `as any` is the narrowest possible escape from the
      // union-member incompatibility that TypeScript cannot resolve here.
      const exists = await (
        (this.prisma as unknown as Record<string, { findFirst: (...args: any[]) => Promise<unknown> }>)
          [table]
          .findFirst({
            where: { tenantId, [field]: candidate },
            select: { id: true },
          })
      );

      if (!exists) {
        return candidate;
      }
    }

    throw new InternalServerErrorException(
      `Failed to generate unique ${prefix} number after ${maxRetries} attempts`,
    );
  }
}
