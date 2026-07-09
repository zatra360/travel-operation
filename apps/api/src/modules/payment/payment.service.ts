import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ActivityService } from '../activity/activity.service';
import { RelationshipValidationService } from '../../common/services/relationship-validation.service';
import { NumberGeneratorService } from '../../common/services/number-generator.service';
import { validateStatusTransition } from '../../common/utils/status-transitions';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { QueryPaymentDto } from './dto/query-payment.dto';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly activity: ActivityService,
    private readonly relValidation: RelationshipValidationService,
    private readonly numberGen: NumberGeneratorService,
  ) {}

  async create(tenantId: string, actorId: string, dto: CreatePaymentDto) {
    if (dto.idempotencyKey) {
      const existing = await this.prisma.payment.findFirst({
        where: { tenantId, idempotencyKey: dto.idempotencyKey },
      });
      if (existing) throw new BadRequestException('Duplicate payment detected via idempotency key');
    }

    await this.relValidation.validateLinkedEntities({
      tenantId,
      clientId: dto.clientId,
      bookingId: dto.bookingId,
      invoiceId: dto.invoiceId,
      branchId: dto.branchId,
    });

    const payment = await this.prisma.payment.create({
      data: {
        tenantId,
        branchId: dto.branchId,
        bookingId: dto.bookingId,
        invoiceId: dto.invoiceId,
        clientId: dto.clientId,
        amount: dto.amount,
        currencyCode: dto.currencyCode ?? 'USD',
        paymentMethod: dto.paymentMethod,
        status: 'PENDING',
        reference: dto.reference,
        idempotencyKey: dto.idempotencyKey,
        notes: dto.notes,
        createdById: actorId,
      },
    });

    await this.audit.logMutation(actorId, tenantId, 'PAYMENT', 'Payment', payment.id, 'CREATE', { amount: dto.amount });
    await this.activity.log(tenantId, actorId, 'PAYMENT_CREATED', `Payment of ${dto.amount} ${dto.currencyCode} recorded`, 'Payment', payment.id, dto.branchId);

    return payment;
  }

  async findAll(tenantId: string, query: QueryPaymentDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;
    const where: any = { tenantId };
    if (query.status) where.status = query.status;
    if (query.invoiceId) where.invoiceId = query.invoiceId;
    if (query.bookingId) where.bookingId = query.bookingId;
    if (query.branchId) where.branchId = query.branchId;
    if (query.search) {
      where.reference = { contains: query.search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.prisma.payment.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(tenantId: string, id: string) {
    const payment = await this.prisma.payment.findFirst({ where: { id, tenantId } });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async update(tenantId: string, actorId: string, id: string, dto: UpdatePaymentDto) {
    const payment = await this.findById(tenantId, id);

    if (dto.status && dto.status !== payment.status) {
      const { valid, allowed } = validateStatusTransition('payment', payment.status, dto.status);
      if (!valid) {
        throw new BadRequestException(`Invalid status transition: ${payment.status} -> ${dto.status}. Allowed: ${allowed.join(', ')}`);
      }
    }

    const updated = await this.prisma.payment.update({
      where: { id },
      data: {
        ...(dto.paymentMethod !== undefined && { paymentMethod: dto.paymentMethod }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.reference !== undefined && { reference: dto.reference }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.receivedAt !== undefined && { receivedAt: new Date(dto.receivedAt) }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });

    await this.audit.logMutation(actorId, tenantId, 'PAYMENT', 'Payment', id, 'STATUS_CHANGE', { from: payment.status, to: updated.status });
    await this.activity.log(tenantId, actorId, 'PAYMENT_UPDATED', `Payment status: ${payment.status} -> ${updated.status}`, 'Payment', id, payment.branchId);

    if (dto.status === 'RECEIVED' && payment.status !== 'RECEIVED') {
      await this.processReceivedPayment(tenantId, actorId, updated);
    }

    return updated;
  }

  private async processReceivedPayment(tenantId: string, actorId: string, payment: any) {
    const receiptNumber = await this.numberGen.generateReceiptNumber(tenantId);

    const receipt = await this.prisma.receipt.create({
      data: {
        tenantId,
        branchId: payment.branchId,
        receiptNumber,
        invoiceId: payment.invoiceId,
        paymentId: payment.id,
        paymentMethod: payment.paymentMethod,
        amount: payment.amount,
        currencyCode: payment.currencyCode,
        reference: payment.reference,
        createdById: actorId,
        receivedAt: new Date(),
      },
    });

    await this.prisma.ledgerEntry.create({
      data: {
        tenantId,
        branchId: payment.branchId,
        referenceType: 'PAYMENT',
        referenceId: payment.id,
        direction: 'CREDIT',
        currencyCode: payment.currencyCode,
        amount: payment.amount,
        description: `Payment received: ${payment.reference ?? receiptNumber}`,
        createdById: actorId,
      },
    });

    if (payment.invoiceId) {
      await this.updateInvoiceBalances(tenantId, payment.invoiceId);
    }

    await this.activity.log(tenantId, actorId, 'PAYMENT_RECEIVED', `Payment of ${payment.amount} ${payment.currencyCode} received`, 'Payment', payment.id);
    await this.activity.log(tenantId, actorId, 'RECEIPT_CREATED', `Receipt #${receiptNumber} generated`, 'Receipt', receipt.id, payment.branchId);
    await this.activity.log(tenantId, actorId, 'LEDGER_ENTRY_CREATED', `Ledger entry for payment ${payment.id}`, 'LedgerEntry', payment.id, payment.branchId);
  }

  private async updateInvoiceBalances(tenantId: string, invoiceId: string) {
    const payments = await this.prisma.payment.aggregate({
      where: { tenantId, invoiceId, status: 'RECEIVED' },
      _sum: { amount: true },
    });

    const paidAmount = Number(payments._sum.amount ?? 0);

    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
    });

    if (!invoice) return;

    const dueAmount = Number(invoice.totalAmount) - Number(paidAmount);
    let newStatus = invoice.status;
    if (dueAmount <= 0) {
      newStatus = 'PAID';
    } else if (paidAmount > 0) {
      newStatus = 'PARTIALLY_PAID';
    }

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { paidAmount: paidAmount, dueAmount: dueAmount, status: newStatus },
    });
  }

  async remove(tenantId: string, actorId: string, id: string) {
    const payment = await this.findById(tenantId, id);
    if (payment.status === 'RECEIVED') {
      throw new BadRequestException('Cannot delete a received payment');
    }
    await this.prisma.payment.delete({ where: { id } });
    await this.audit.logMutation(actorId, tenantId, 'PAYMENT', 'Payment', id, 'DELETE', { reference: payment.reference });
    return { id, deleted: true };
  }
}
