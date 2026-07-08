import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { QueryPaymentDto } from './dto/query-payment.dto';

@Injectable()
export class PaymentService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async create(tenantId: string, actorId: string, dto: CreatePaymentDto) {
    const payment = await this.prisma.payment.create({
      data: {
        tenantId, branchId: dto.branchId ?? null,
        bookingId: dto.bookingId ?? null, invoiceId: dto.invoiceId ?? null,
        amount: dto.amount ?? 0, currencyCode: dto.currencyCode ?? 'USD',
        paymentMethod: dto.paymentMethod ?? null, status: dto.status ?? 'PENDING',
        reference: dto.reference ?? null, notes: dto.notes ?? null,
        receivedAt: dto.receivedAt ? new Date(dto.receivedAt) : null,
      },
    });
    await this.audit.logMutation(actorId, tenantId, 'PAYMENT', 'Payment', payment.id, 'CREATE', { amount: payment.amount, status: payment.status }, payment.branchId ?? undefined);
    return payment;
  }

  async findAll(tenantId: string, query: QueryPaymentDto) {
    const page = query.page ?? 1; const limit = query.limit ?? 50; const skip = (page - 1) * limit;
    const where: any = { tenantId };
    if (query.status) where.status = query.status;
    if (query.bookingId) where.bookingId = query.bookingId;
    if (query.invoiceId) where.invoiceId = query.invoiceId;
    if (query.branchId) where.branchId = query.branchId;
    if (query.search) where.OR = [{ reference: { contains: query.search, mode: 'insensitive' } }];
    const [data, total] = await Promise.all([this.prisma.payment.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }), this.prisma.payment.count({ where })]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(tenantId: string, id: string) {
    const payment = await this.prisma.payment.findFirst({ where: { id, tenantId } });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async update(tenantId: string, actorId: string, id: string, dto: UpdatePaymentDto) {
    await this.findById(tenantId, id);
    const payment = await this.prisma.payment.update({
      where: { id },
      data: {
        ...(dto.bookingId !== undefined && { bookingId: dto.bookingId }),
        ...(dto.invoiceId !== undefined && { invoiceId: dto.invoiceId }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.currencyCode !== undefined && { currencyCode: dto.currencyCode }),
        ...(dto.paymentMethod !== undefined && { paymentMethod: dto.paymentMethod }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.reference !== undefined && { reference: dto.reference }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.receivedAt !== undefined && { receivedAt: dto.receivedAt ? new Date(dto.receivedAt) : null }),
        ...(dto.branchId !== undefined && { branchId: dto.branchId }),
      },
    });
    await this.audit.logMutation(actorId, tenantId, 'PAYMENT', 'Payment', payment.id, 'UPDATE', { changes: dto }, payment.branchId ?? undefined);
    return payment;
  }

  async remove(tenantId: string, actorId: string, id: string) {
    const payment = await this.findById(tenantId, id);
    await this.prisma.payment.delete({ where: { id } });
    await this.audit.logMutation(actorId, tenantId, 'PAYMENT', 'Payment', payment.id, 'DELETE', { amount: payment.amount }, payment.branchId ?? undefined);
    return { id, deleted: true };
  }
}
