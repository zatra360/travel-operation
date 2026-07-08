import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { QueryInvoiceDto } from './dto/query-invoice.dto';

@Injectable()
export class InvoiceService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async create(tenantId: string, actorId: string, dto: CreateInvoiceDto) {
    const invoice = await this.prisma.invoice.create({
      data: {
        tenantId, branchId: dto.branchId ?? null,
        invoiceNumber: dto.invoiceNumber, status: dto.status ?? 'DRAFT',
        clientId: dto.clientId ?? null, bookingId: dto.bookingId ?? null,
        currencyCode: dto.currencyCode ?? 'USD',
        subtotal: dto.subtotal ?? 0, taxAmount: dto.taxAmount ?? 0,
        discountAmount: dto.discountAmount ?? 0, totalAmount: dto.totalAmount ?? 0,
        paidAmount: dto.paidAmount ?? 0, dueAmount: dto.dueAmount ?? 0,
        issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : null,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        notes: dto.notes ?? null,
      },
    });
    await this.audit.logMutation(actorId, tenantId, 'INVOICE', 'Invoice', invoice.id, 'CREATE', { invoiceNumber: invoice.invoiceNumber }, invoice.branchId ?? undefined);
    return invoice;
  }

  async findAll(tenantId: string, query: QueryInvoiceDto) {
    const page = query.page ?? 1; const limit = query.limit ?? 50; const skip = (page - 1) * limit;
    const where: any = { tenantId, deletedAt: null };
    if (query.status) where.status = query.status;
    if (query.clientId) where.clientId = query.clientId;
    if (query.branchId) where.branchId = query.branchId;
    if (query.search) where.OR = [{ invoiceNumber: { contains: query.search, mode: 'insensitive' } }];
    const [data, total] = await Promise.all([this.prisma.invoice.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }), this.prisma.invoice.count({ where })]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(tenantId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async update(tenantId: string, actorId: string, id: string, dto: UpdateInvoiceDto) {
    await this.findById(tenantId, id);
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
        ...(dto.totalAmount !== undefined && { totalAmount: dto.totalAmount }),
        ...(dto.paidAmount !== undefined && { paidAmount: dto.paidAmount }),
        ...(dto.dueAmount !== undefined && { dueAmount: dto.dueAmount }),
        ...(dto.issuedAt !== undefined && { issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : null }),
        ...(dto.dueAt !== undefined && { dueAt: dto.dueAt ? new Date(dto.dueAt) : null }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.branchId !== undefined && { branchId: dto.branchId }),
      },
    });
    await this.audit.logMutation(actorId, tenantId, 'INVOICE', 'Invoice', invoice.id, 'UPDATE', { changes: dto }, invoice.branchId ?? undefined);
    return invoice;
  }

  async remove(tenantId: string, actorId: string, id: string) {
    const invoice = await this.findById(tenantId, id);
    await this.prisma.invoice.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.logMutation(actorId, tenantId, 'INVOICE', 'Invoice', invoice.id, 'DELETE', { invoiceNumber: invoice.invoiceNumber }, invoice.branchId ?? undefined);
    return { id, deleted: true };
  }
}
