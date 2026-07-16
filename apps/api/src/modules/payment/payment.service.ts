import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { enforceBranchScope } from '../../common/utils/scope';
import { AuditService } from '../audit/audit.service';
import { ActivityService } from '../activity/activity.service';
import { RelationshipValidationService } from '../../common/services/relationship-validation.service';
import { LookupValidationService } from '../master-data/lookup-validation.service';
import { NumberGeneratorService } from '../../common/services/number-generator.service';
import { validateStatusTransition } from '../../common/utils/status-transitions';
import { ClientScoringService } from '../client/client-scoring.service';
import { GLPostingService } from '../accounting/gl-posting.service';
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
    private readonly lookup: LookupValidationService,
    private readonly numberGen: NumberGeneratorService,
    private readonly scoring: ClientScoringService,
    private readonly glPosting: GLPostingService,
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
    await this.lookup.validateMultiple(tenantId, [
      { categoryCode: 'payment-method', code: dto.paymentMethod },
    ].filter((v) => v.code));

    const currencyCode = dto.currencyCode ?? 'USD';
    const exchangeRate = dto.exchangeRate ?? 1;
    const baseCurrencyCode = dto.baseCurrencyCode ?? currencyCode;
    const baseAmount = Number(dto.amount ?? 0) * Number(exchangeRate);

    const payment = await this.prisma.payment
      .create({
        data: {
          tenantId,
          branchId: dto.branchId,
          bookingId: dto.bookingId,
          invoiceId: dto.invoiceId,
          clientId: dto.clientId,
          amount: dto.amount,
          currencyCode,
          exchangeRate,
          baseCurrencyCode,
          baseAmount,
          paymentMethod: dto.paymentMethod,
          status: 'PENDING',
          reference: dto.reference,
          idempotencyKey: dto.idempotencyKey,
          notes: dto.notes,
          bankAccountId: dto.bankAccountId ?? null,
          createdById: actorId,
        },
      })
      .catch((err) => {
        // Unique violation on (tenantId, idempotencyKey): a concurrent request
        // already created this payment. Treat as a duplicate rather than a 500.
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          throw new BadRequestException('Duplicate payment detected via idempotency key');
        }
        throw err;
      });

    await this.audit.logMutation(actorId, tenantId, 'PAYMENT', 'Payment', payment.id, 'CREATE', { amount: dto.amount });
    await this.activity.log(tenantId, actorId, 'PAYMENT_CREATED', `Payment of ${dto.amount} ${dto.currencyCode} recorded`, 'Payment', payment.id, dto.branchId);

    // Log payment gateway attempt
    await this.prisma.transactionLog.create({
      data: {
        tenantId, paymentId: payment.id,
        gateway: dto.paymentMethod ?? 'manual',
        gatewayRef: dto.reference ?? null,
        amount: dto.amount ?? 0, currencyCode,
        status: 'PENDING', attemptedAt: new Date(),
      },
    });

    this.scoring.refreshInBackground(tenantId, payment.clientId);
    return payment;
  }

  async findAll(tenantId: string, query: QueryPaymentDto, activeBranchId?: string) {
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

    enforceBranchScope(where, activeBranchId);
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

    const willReceive = dto.status === 'RECEIVED' && payment.status !== 'RECEIVED';
    const receiptNumber = willReceive ? await this.numberGen.generateReceiptNumber(tenantId) : undefined;

    // Marking a payment RECEIVED posts a receipt, a ledger credit and
    // recalculates the invoice balance. These must commit together or not at
    // all, so they run inside a single transaction with the status update.
    const { updated, receipt } = await this.prisma.$transaction(async (tx) => {
      const u = await tx.payment.update({
        where: { id },
        data: {
          ...(dto.paymentMethod !== undefined && { paymentMethod: dto.paymentMethod }),
          ...(dto.status !== undefined && { status: dto.status }),
          ...(dto.reference !== undefined && { reference: dto.reference }),
          ...(dto.bankAccountId !== undefined && { bankAccountId: dto.bankAccountId }),
          ...(dto.amount !== undefined && { amount: dto.amount }),
          ...(dto.receivedAt !== undefined && { receivedAt: new Date(dto.receivedAt) }),
          ...(dto.notes !== undefined && { notes: dto.notes }),
        },
      });

      let createdReceipt: { id: string } | undefined;
      if (willReceive) {
        createdReceipt = await this.processReceivedPayment(tx, tenantId, actorId, u, receiptNumber!);
        await this.glPosting.postPaymentReceived(tx, tenantId, actorId, u);
      }
      return { updated: u, receipt: createdReceipt };
    });

    await this.audit.logMutation(actorId, tenantId, 'PAYMENT', 'Payment', id, 'STATUS_CHANGE', { from: payment.status, to: updated.status });
    await this.activity.log(tenantId, actorId, 'PAYMENT_UPDATED', `Payment status: ${payment.status} -> ${updated.status}`, 'Payment', id, payment.branchId);

    if (dto.status !== undefined && dto.status !== payment.status) {
      await this.prisma.transactionLog.updateMany({
        where: { paymentId: id, status: 'PENDING' },
        data: {
          status: dto.status === 'RECEIVED' ? 'SUCCESS' : dto.status === 'FAILED' ? 'FAILED' : dto.status,
          completedAt: new Date(),
        },
      });
    }

    if (willReceive && receipt) {
      await this.activity.log(tenantId, actorId, 'PAYMENT_RECEIVED', `Payment of ${updated.amount} ${updated.currencyCode} received`, 'Payment', updated.id);
      await this.activity.log(tenantId, actorId, 'RECEIPT_CREATED', `Receipt #${receiptNumber} generated`, 'Receipt', receipt.id, updated.branchId);
      await this.activity.log(tenantId, actorId, 'LEDGER_ENTRY_CREATED', `Ledger entry for payment ${updated.id}`, 'LedgerEntry', updated.id, updated.branchId);
    }

    this.scoring.refreshInBackground(tenantId, updated.clientId);
    return updated;
  }

  private async processReceivedPayment(
    tx: Prisma.TransactionClient,
    tenantId: string,
    actorId: string,
    payment: any,
    receiptNumber: string,
  ) {
    const receipt = await tx.receipt.create({
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

    await tx.ledgerEntry.create({
      data: {
        tenantId,
        branchId: payment.branchId,
        referenceType: 'PAYMENT',
        referenceId: payment.id,
        direction: 'CREDIT',
        currencyCode: payment.currencyCode,
        exchangeRate: payment.exchangeRate ?? 1,
        baseCurrencyCode: payment.baseCurrencyCode ?? payment.currencyCode,
        baseAmount: payment.baseAmount ?? payment.amount,
        amount: payment.amount,
        description: `Payment received: ${payment.reference ?? receiptNumber}`,
        createdById: actorId,
      },
    });

    if (payment.invoiceId) {
      await this.updateInvoiceBalances(tx, tenantId, payment.invoiceId);
    }

    if (payment.bankAccountId) {
      await tx.bankAccount.update({
        where: { id: payment.bankAccountId },
        data: { currentBalance: { increment: Number(payment.amount) } },
      });
    }

    return receipt;
  }

  private async updateInvoiceBalances(
    tx: Prisma.TransactionClient,
    tenantId: string,
    invoiceId: string,
  ) {
    const payments = await tx.payment.aggregate({
      where: { tenantId, invoiceId, status: 'RECEIVED' },
      _sum: { amount: true },
    });

    const paidAmount = Number(payments._sum.amount ?? 0);

    const invoice = await tx.invoice.findFirst({
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

    await tx.invoice.update({
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
    this.scoring.refreshInBackground(tenantId, payment.clientId);
    return { id, deleted: true };
  }
}
