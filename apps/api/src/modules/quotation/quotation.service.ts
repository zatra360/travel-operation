import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { QueryQuotationDto } from './dto/query-quotation.dto';
import { validateStatusTransition } from '../../common/utils/status-transitions';

@Injectable()
export class QuotationService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  private async validateLinked(tenantId: string, dto: any) {
    if (dto.clientId) { const c = await this.prisma.client.findFirst({ where: { id: dto.clientId, tenantId } }); if (!c) throw new BadRequestException('Client not in this tenant'); }
    if (dto.leadId) { const l = await this.prisma.lead.findFirst({ where: { id: dto.leadId, tenantId } }); if (!l) throw new BadRequestException('Lead not in this tenant'); }
    if (dto.assignedToId) { const m = await this.prisma.userTenantMembership.findUnique({ where: { userId_tenantId: { userId: dto.assignedToId, tenantId } } }); if (!m) throw new BadRequestException('User not in this tenant'); }
    if (dto.branchId) { const b = await this.prisma.branch.findFirst({ where: { id: dto.branchId, tenantId } }); if (!b) throw new BadRequestException('Branch not in this tenant'); }
  }

  private async calculateTotals(quotationId: string) {
    const items = await this.prisma.quotationLineItem.findMany({ where: { quotationId } });
    const subtotal = items.reduce((sum, i) => sum + Number(i.lineTotal), 0);
    const taxTotal = Math.round(subtotal * 0.05 * 100) / 100;
    const grandTotal = subtotal + taxTotal;
    await this.prisma.quotation.update({ where: { id: quotationId }, data: { subtotal, taxTotal, grandTotal, discountTotal: 0 } });
  }

  async create(tenantId: string, actorId: string, dto: CreateQuotationDto) {
    await this.validateLinked(tenantId, dto);
    const quotation = await this.prisma.quotation.create({
      data: { tenantId, branchId: dto.branchId ?? null, quoteNumber: dto.quoteNumber, status: dto.status ?? 'DRAFT', title: dto.title ?? null, clientId: dto.clientId ?? null, leadId: dto.leadId ?? null, assignedToId: dto.assignedToId ?? null, currencyCode: dto.currencyCode ?? 'USD', subtotal: dto.subtotal ?? 0, taxTotal: dto.taxTotal ?? 0, discountTotal: dto.discountTotal ?? 0, grandTotal: dto.grandTotal ?? 0, validUntil: dto.validUntil ? new Date(dto.validUntil) : null, notes: dto.notes ?? null, terms: dto.terms ?? null },
    });
    await this.audit.logMutation(actorId, tenantId, 'QUOTATION', 'Quotation', quotation.id, 'CREATE', { quoteNumber: quotation.quoteNumber }, quotation.branchId ?? undefined);
    return quotation;
  }

  async findAll(tenantId: string, query: QueryQuotationDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: any = { tenantId, deletedAt: null };
    if (query.status) where.status = query.status;
    if (query.clientId) where.clientId = query.clientId;
    if (query.assignedToId) where.assignedToId = query.assignedToId;
    if (query.branchId) where.branchId = query.branchId;
    if (query.search) {
      where.OR = [
        { quoteNumber: { contains: query.search, mode: 'insensitive' } },
        { title: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.quotation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.quotation.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(tenantId: string, id: string) {
    const quotation = await this.prisma.quotation.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!quotation) throw new NotFoundException('Quotation not found');
    return quotation;
  }

  async update(tenantId: string, actorId: string, id: string, dto: UpdateQuotationDto) {
    const current = await this.findById(tenantId, id);
    await this.validateLinked(tenantId, dto);

    if (dto.status && dto.status !== current.status) {
      const check = validateStatusTransition('quotation', current.status, dto.status);
      if (!check.valid) throw new BadRequestException(`Invalid quotation status transition from ${current.status} to ${dto.status}. Allowed: ${check.allowed.join(', ') || 'none'}`);
      await this.prisma.quotationStatusLog.create({
        data: { tenantId, quotationId: id, fromStatus: current.status, toStatus: dto.status, actorId },
      });
    }

    const quotation = await this.prisma.quotation.update({
      where: { id },
      data: {
        ...(dto.quoteNumber !== undefined && { quoteNumber: dto.quoteNumber }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.clientId !== undefined && { clientId: dto.clientId }),
        ...(dto.leadId !== undefined && { leadId: dto.leadId }),
        ...(dto.assignedToId !== undefined && { assignedToId: dto.assignedToId }),
        ...(dto.currencyCode !== undefined && { currencyCode: dto.currencyCode }),
        ...(dto.subtotal !== undefined && { subtotal: dto.subtotal }),
        ...(dto.taxTotal !== undefined && { taxTotal: dto.taxTotal }),
        ...(dto.discountTotal !== undefined && { discountTotal: dto.discountTotal }),
        ...(dto.grandTotal !== undefined && { grandTotal: dto.grandTotal }),
        ...(dto.validUntil !== undefined && { validUntil: dto.validUntil ? new Date(dto.validUntil) : null }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.terms !== undefined && { terms: dto.terms }),
        ...(dto.branchId !== undefined && { branchId: dto.branchId }),
      },
    });

    await this.audit.logMutation(
      actorId,
      tenantId,
      'QUOTATION',
      'Quotation',
      quotation.id,
      'UPDATE',
      { changes: dto },
      quotation.branchId ?? undefined,
    );

    return quotation;
  }

  async remove(tenantId: string, actorId: string, id: string) {
    const quotation = await this.findById(tenantId, id);

    await this.prisma.quotation.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.audit.logMutation(
      actorId,
      tenantId,
      'QUOTATION',
      'Quotation',
      quotation.id,
      'DELETE',
      { quoteNumber: quotation.quoteNumber },
      quotation.branchId ?? undefined,
    );

    return { id, deleted: true };
  }
}
