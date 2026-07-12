import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { enforceBranchScope } from '../../common/utils/scope';
import { AuditService } from '../audit/audit.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { UpdateReceiptDto } from './dto/update-receipt.dto';
import { QueryReceiptDto } from './dto/query-receipt.dto';

@Injectable()
export class ReceiptService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async create(tenantId: string, actorId: string, dto: CreateReceiptDto) {
    const receipt = await this.prisma.receipt.create({
      data: {
        tenantId, branchId: dto.branchId ?? null,
        receiptNumber: dto.receiptNumber, invoiceId: dto.invoiceId ?? null,
        paymentMethod: dto.paymentMethod ?? null, amount: dto.amount ?? 0,
        currencyCode: dto.currencyCode ?? 'USD', reference: dto.reference ?? null,
        notes: dto.notes ?? null, receivedAt: dto.receivedAt ? new Date(dto.receivedAt) : new Date(),
      },
    });
    await this.audit.logMutation(actorId, tenantId, 'RECEIPT', 'Receipt', receipt.id, 'CREATE', { receiptNumber: receipt.receiptNumber }, receipt.branchId ?? undefined);
    return receipt;
  }

  async findAll(tenantId: string, query: QueryReceiptDto, activeBranchId?: string) {
    const page = query.page ?? 1; const limit = query.limit ?? 50; const skip = (page - 1) * limit;
    const where: any = { tenantId };
    if (query.invoiceId) where.invoiceId = query.invoiceId;
    if (query.branchId) where.branchId = query.branchId;
    if (query.search) where.OR = [{ receiptNumber: { contains: query.search, mode: 'insensitive' } }];
    enforceBranchScope(where, activeBranchId);
    const [data, total] = await Promise.all([this.prisma.receipt.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }), this.prisma.receipt.count({ where })]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(tenantId: string, id: string) {
    const receipt = await this.prisma.receipt.findFirst({ where: { id, tenantId } });
    if (!receipt) throw new NotFoundException('Receipt not found');
    return receipt;
  }

  async update(tenantId: string, actorId: string, id: string, dto: UpdateReceiptDto) {
    await this.findById(tenantId, id);
    const receipt = await this.prisma.receipt.update({
      where: { id },
      data: {
        ...(dto.receiptNumber !== undefined && { receiptNumber: dto.receiptNumber }),
        ...(dto.invoiceId !== undefined && { invoiceId: dto.invoiceId }),
        ...(dto.paymentMethod !== undefined && { paymentMethod: dto.paymentMethod }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.currencyCode !== undefined && { currencyCode: dto.currencyCode }),
        ...(dto.reference !== undefined && { reference: dto.reference }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.receivedAt !== undefined && { receivedAt: dto.receivedAt ? new Date(dto.receivedAt) : undefined }),
        ...(dto.branchId !== undefined && { branchId: dto.branchId }),
      },
    });
    await this.audit.logMutation(actorId, tenantId, 'RECEIPT', 'Receipt', receipt.id, 'UPDATE', { changes: dto }, receipt.branchId ?? undefined);
    return receipt;
  }
}
