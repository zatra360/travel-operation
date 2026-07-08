import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryLedgerDto } from './dto/query-ledger.dto';

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, query: QueryLedgerDto) {
    const page = query.page ?? 1; const limit = query.limit ?? 50; const skip = (page - 1) * limit;
    const where: any = { tenantId };
    if (query.referenceType) where.referenceType = query.referenceType;
    if (query.branchId) where.branchId = query.branchId;
    if (query.search) where.OR = [{ description: { contains: query.search, mode: 'insensitive' } }];
    const [data, total] = await Promise.all([this.prisma.ledgerEntry.findMany({ where, orderBy: { entryDate: 'desc' }, skip, take: limit }), this.prisma.ledgerEntry.count({ where })]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
