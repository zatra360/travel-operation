import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { enforceBranchScope } from '../../common/utils/scope';
import { AuditService } from '../audit/audit.service';
import { NumberGeneratorService } from '../../common/services/number-generator.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { UpdateReceiptDto } from './dto/update-receipt.dto';
import { QueryReceiptDto } from './dto/query-receipt.dto';

@Injectable()
export class ReceiptService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly numberGen: NumberGeneratorService,
  ) {}

  async create(tenantId: string, actorId: string, dto: CreateReceiptDto) {
    const receiptNumber = dto.receiptNumber || (await this.numberGen.generateReceiptNumber(tenantId));
    const receipt = await this.prisma.receipt.create({
      data: {
        tenantId, branchId: dto.branchId ?? null,
        receiptNumber, invoiceId: dto.invoiceId ?? null,
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
    if (query.search) where.OR = [{ receiptNumber: { contains: query.search, mode: 'insensitive' } }];
    if (query.invoiceId) where.invoiceId = query.invoiceId;
    if (query.branchId) where.branchId = query.branchId;
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
    const receipt = await this.prisma.receipt.update({ where: { id }, data: { ...dto } });
    await this.audit.logMutation(actorId, tenantId, 'RECEIPT', 'Receipt', id, 'UPDATE', { changes: dto }, receipt.branchId ?? undefined);
    return receipt;
  }

  async remove(tenantId: string, actorId: string, id: string) {
    const receipt = await this.findById(tenantId, id);
    await this.prisma.receipt.delete({ where: { id } });
    await this.audit.logMutation(actorId, tenantId, 'RECEIPT', 'Receipt', id, 'DELETE', { receiptNumber: receipt.receiptNumber }, receipt.branchId ?? undefined);
    return { id, deleted: true };
  }
}
