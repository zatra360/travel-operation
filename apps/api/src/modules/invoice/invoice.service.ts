import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ActivityService } from '../activity/activity.service';
import { RelationshipValidationService } from '../../common/services/relationship-validation.service';
import { NumberGeneratorService } from '../../common/services/number-generator.service';
import { validateStatusTransition } from '../../common/utils/status-transitions';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { QueryInvoiceDto } from './dto/query-invoice.dto';

@Injectable()
export class InvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly activity: ActivityService,
    private readonly relValidation: RelationshipValidationService,
    private readonly numberGen: NumberGeneratorService,
  ) {}

  async create(tenantId: string, actorId: string, dto: CreateInvoiceDto) {
    await this.relValidation.validateLinkedEntities({
      tenantId, clientId: dto.clientId, bookingId: dto.bookingId, branchId: dto.branchId,
    });

    const invoiceNumber = dto.invoiceNumber || (await this.numberGen.generateInvoiceNumber(tenantId));
    const totalAmount = dto.totalAmount ?? 0;
    const status = dto.status ?? 'DRAFT';

    const invoice = await this.prisma.invoice.create({
      data: {
        tenantId, branchId: dto.branchId ?? null, invoiceNumber, status,
        clientId: dto.clientId ?? null, bookingId: dto.bookingId ?? null,
        quotationId: dto.quotationId ?? null,
        currencyCode: dto.currencyCode ?? 'USD',
        subtotal: dto.subtotal ?? 0, taxAmount: dto.taxAmount ?? 0,
        discountAmount: dto.discountAmount ?? 0, totalAmount,
        paidAmount: 0, dueAmount: totalAmount,
        issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : (status === 'SENT' ? new Date() : null),
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        notes: dto.notes ?? null, createdById: actorId,
      },
    });

    await this.audit.logMutation(actorId, tenantId, 'INVOICE', 'Invoice', invoice.id, 'CREATE', { invoiceNumber });
    await this.activity.logEntityEvent({
      tenantId, userId: actorId, type: 'INVOICE_CREATED',
      subject: `Invoice ${invoiceNumber} created`, entity: 'Invoice', entityId: invoice.id,
      branchId: invoice.branchId,
    });

    return invoice;
  }

  async findAll(tenantId: string, query: QueryInvoiceDto) {
    const page = query.page ?? 1; const limit = query.limit ?? 50; const skip = (page - 1) * limit;
    const where: any = { tenantId, deletedAt: null };
    if (query.status) where.status = query.status;
    if (query.clientId) where.clientId = query.clientId;
    if (query.branchId) where.branchId = query.branchId;
    if (query.search) {
      where.OR = [{ invoiceNumber: { contains: query.search, mode: 'insensitive' } }];
    }
    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.prisma.invoice.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(tenantId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { lines: true, payments: true, receipts: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async getTimeline(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    return this.activity.findByEntity(tenantId, 'Invoice', id);
  }

  async getLedger(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    return this.prisma.ledgerEntry.findMany({
      where: { tenantId, referenceType: 'INVOICE', referenceId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(tenantId: string, actorId: string, id: string, dto: UpdateInvoiceDto) {
    const current = await this.prisma.invoice.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!current) throw new NotFoundException('Invoice not found');

    await this.relValidation.validateLinkedEntities({
      tenantId, clientId: dto.clientId, bookingId: dto.bookingId, branchId: dto.branchId,
    });

    if (dto.status && dto.status !== current.status) {
      const check = validateStatusTransition('invoice', current.status, dto.status);
      if (!check.valid) {
        throw new BadRequestException(`Invalid transition from ${current.status} to ${dto.status}. Allowed: ${check.allowed.join(', ') || 'none'}`);
      }
      if (dto.status === 'SENT') dto.issuedAt = dto.issuedAt ?? new Date().toISOString();
    }

    const invoice = await this.prisma.invoice.update({
      where: { id },
      data: {
        ...(dto.invoiceNumber !== undefined && { invoiceNumber: dto.invoiceNumber }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.clientId !== undefined && { clientId: dto.clientId }),
        ...(dto.bookingId !== undefined && { bookingId: dto.bookingId }),
        ...(dto.currencyCode !== undefined && { currencyCode: dto.currencyCode }),
        ...(dto.subtotal !== undefined && { subtotal: dto.subtotal }),
        ...(dto.taxAmount !== undefined && { taxAmount: dto.taxAmount }),
        ...(dto.discountAmount !== undefined && { discountAmount: dto.discountAmount }),
        ...(dto.totalAmount !== undefined && { totalAmount: dto.totalAmount, dueAmount: dto.totalAmount }),
        ...(dto.paidAmount !== undefined && { paidAmount: dto.paidAmount }),
        ...(dto.dueAmount !== undefined && { dueAmount: dto.dueAmount }),
        ...(dto.issuedAt !== undefined && { issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : null }),
        ...(dto.dueAt !== undefined && { dueAt: dto.dueAt ? new Date(dto.dueAt) : null }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.branchId !== undefined && { branchId: dto.branchId }),
        updatedById: actorId,
      },
    });

    if (dto.status && dto.status !== current.status) {
      await this.activity.logEntityEvent({
        tenantId, userId: actorId, type: 'INVOICE_STATUS_CHANGED',
        subject: `Invoice ${invoice.invoiceNumber}: ${current.status} -> ${dto.status}`,
        entity: 'Invoice', entityId: id, branchId: invoice.branchId,
      });
    }

    await this.audit.logMutation(actorId, tenantId, 'INVOICE', 'Invoice', id, dto.status !== current.status ? 'STATUS_CHANGE' : 'UPDATE', { changes: dto });

    return invoice;
  }

  async addLine(tenantId: string, actorId: string, invoiceId: string, dto: any) {
    const invoice = await this.findById(tenantId, invoiceId);
    if (invoice.status !== 'DRAFT') throw new BadRequestException('Can only add lines to draft invoices');

    const line = await this.prisma.invoiceLine.create({
      data: {
        tenantId, invoiceId, serviceType: dto.serviceType, description: dto.description,
        quantity: dto.quantity ?? 1, unitPrice: dto.unitPrice ?? 0,
        lineTotal: (dto.quantity ?? 1) * (dto.unitPrice ?? 0),
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    await this.recalculateInvoiceTotals(tenantId, invoiceId);
    return line;
  }

  async removeLine(tenantId: string, actorId: string, invoiceId: string, lineId: string) {
    const invoice = await this.findById(tenantId, invoiceId);
    if (invoice.status !== 'DRAFT') throw new BadRequestException('Can only remove lines from draft invoices');

    await this.prisma.invoiceLine.delete({ where: { id: lineId } });
    await this.recalculateInvoiceTotals(tenantId, invoiceId);
    return { id: lineId, deleted: true };
  }

  private async recalculateInvoiceTotals(tenantId: string, invoiceId: string) {
    const lines = await this.prisma.invoiceLine.findMany({ where: { tenantId, invoiceId } });
    const subtotal = lines.reduce((sum, l) => sum + Number(l.lineTotal), 0);
    const taxAmount = Math.round(subtotal * 0.05 * 100) / 100;
    const totalAmount = subtotal + taxAmount;

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { subtotal, taxAmount, totalAmount, dueAmount: totalAmount },
    });
  }

  async void(tenantId: string, actorId: string, id: string) {
    return this.update(tenantId, actorId, id, { status: 'CANCELLED' } as any);
  }

  async remove(tenantId: string, actorId: string, id: string) {
    const invoice = await this.findById(tenantId, id);
    if (Number(invoice.paidAmount) > 0) throw new BadRequestException('Cannot delete an invoice with payments');
    await this.prisma.invoice.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.logMutation(actorId, tenantId, 'INVOICE', 'Invoice', id, 'DELETE', { invoiceNumber: invoice.invoiceNumber });
    return { id, deleted: true };
  }
}
