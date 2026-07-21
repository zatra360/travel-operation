import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditLedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, query: { page?: number; limit?: number; action?: string; tableName?: string; recordId?: string }) {
    const page = Number(query.page ?? 1);
    const limit = Math.min(Number(query.limit ?? 50), 200);
    const skip = (page - 1) * limit;
    const where: any = { tenantId };
    if (query.action) where.action = query.action;
    if (query.tableName) where.tableName = query.tableName;
    if (query.recordId) where.recordId = query.recordId;

    const [rows, total] = await Promise.all([
      this.prisma.systemAuditLog.findMany({ where, orderBy: { eventSequence: 'desc' }, skip, take: limit }),
      this.prisma.systemAuditLog.count({ where }),
    ]);

    return {
      data: rows.map((r) => ({ ...r, eventSequence: r.eventSequence.toString() })),
      total, page, limit, totalPages: Math.ceil(total / limit),
    };
  }

  async verifyChain(tenantId: string) {
    const rows = await this.prisma.$queryRaw<Array<{
      is_valid: boolean; checked_count: bigint; broken_at_sequence: bigint | null; detail: string;
    }>>`SELECT * FROM fn_verify_audit_chain(${tenantId})`;
    const r = rows[0];
    return {
      isValid: r.is_valid,
      checkedCount: Number(r.checked_count),
      brokenAtSequence: r.broken_at_sequence !== null ? Number(r.broken_at_sequence) : null,
      detail: r.detail,
    };
  }
}
