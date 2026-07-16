import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountingAuditService } from './accounting-audit.service';
import { ReconciliationService } from './reconciliation.service';
import { CreateFiscalYearDto, ClosePeriodDto, ReopenPeriodDto } from './dto/fiscal-period.dto';

const CLOSE_TRANSITIONS: Record<string, string[]> = {
  SOFT_CLOSE: ['OPEN'],
  CLOSE: ['OPEN', 'SOFT_CLOSED'],
  LOCK: ['OPEN', 'SOFT_CLOSED', 'CLOSED'],
};

const CLOSE_TARGET: Record<string, string> = {
  SOFT_CLOSE: 'SOFT_CLOSED',
  CLOSE: 'CLOSED',
  LOCK: 'LOCKED',
};

@Injectable()
export class FiscalPeriodService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AccountingAuditService,
    private readonly reconciliation: ReconciliationService,
  ) {}

  async findAll(tenantId: string) {
    return this.prisma.fiscalYear.findMany({
      where: { tenantId },
      include: { periods: { orderBy: { periodNumber: 'asc' } } },
      orderBy: { startDate: 'desc' },
    });
  }

  async createFiscalYear(tenantId: string, actorId: string, dto: CreateFiscalYearDto) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end <= start) throw new BadRequestException('Fiscal year end date must be after start date');

    const overlap = await this.prisma.fiscalYear.findFirst({
      where: { tenantId, startDate: { lte: end }, endDate: { gte: start } },
    });
    if (overlap) throw new ConflictException(`Fiscal year overlaps with ${overlap.code}`);

    const fiscalYear = await this.prisma.$transaction(async (tx) => {
      const fy = await tx.fiscalYear.create({
        data: { tenantId, code: dto.code, startDate: start, endDate: end, createdById: actorId },
      });

      if ((dto.generatePeriods ?? 'MONTHLY') === 'MONTHLY') {
        let periodStart = new Date(start);
        let periodNumber = 1;
        while (periodStart < end) {
          const monthEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0, 23, 59, 59, 999);
          const periodEnd = monthEnd < end ? monthEnd : end;
          await tx.accountingPeriod.create({
            data: {
              tenantId,
              fiscalYearId: fy.id,
              periodNumber,
              code: `${dto.code}-P${String(periodNumber).padStart(2, '0')}`,
              startDate: periodStart,
              endDate: periodEnd,
            },
          });
          periodNumber += 1;
          periodStart = new Date(periodEnd.getTime() + 1);
        }
      }

      return tx.fiscalYear.findUnique({
        where: { id: fy.id },
        include: { periods: { orderBy: { periodNumber: 'asc' } } },
      });
    });

    await this.audit.append({
      tenantId, userId: actorId, action: 'FISCAL_YEAR_CREATED', actionCategory: 'ACCOUNTING',
      tableName: 'FiscalYear', recordId: fiscalYear!.id,
      afterState: { code: dto.code, startDate: dto.startDate, endDate: dto.endDate, periods: fiscalYear!.periods.length },
    });

    return fiscalYear;
  }

  async closeChecklist(tenantId: string, periodId: string) {
    const period = await this.prisma.accountingPeriod.findFirst({ where: { id: periodId, tenantId } });
    if (!period) throw new NotFoundException('Accounting period not found');

    const blockers: Array<{ type: string; detail: string; count: number }> = [];

    const unpostedJournals = await this.prisma.journalEntry.findMany({
      where: {
        tenantId,
        status: { in: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED'] },
        entryDate: { gte: period.startDate, lte: period.endDate },
      },
      select: { id: true, description: true, status: true },
    });
    if (unpostedJournals.length > 0) {
      blockers.push({
        type: 'UNPOSTED_JOURNALS',
        detail: `${unpostedJournals.length} journal entr${unpostedJournals.length === 1 ? 'y' : 'ies'} dated in this period are not posted`,
        count: unpostedJournals.length,
      });
    }

    const unpostedDocuments = await this.reconciliation.findUnpostedDocuments(tenantId, period.startDate, period.endDate);
    const glActive = (await this.prisma.gLAccount.count({ where: { tenantId } })) > 0;
    if (glActive && unpostedDocuments.length > 0) {
      const byType = unpostedDocuments.reduce<Record<string, number>>((acc, d) => {
        acc[d.documentType] = (acc[d.documentType] ?? 0) + 1;
        return acc;
      }, {});
      for (const [type, count] of Object.entries(byType)) {
        blockers.push({
          type: `UNPOSTED_${type.toUpperCase()}S`,
          detail: `${count} ${type.toLowerCase()} document(s) in this period have no posted journal entry`,
          count,
        });
      }
    }

    return {
      period: { id: period.id, code: period.code, status: period.status, startDate: period.startDate, endDate: period.endDate },
      glActivated: glActive,
      canClose: blockers.length === 0,
      blockers,
      unpostedJournals,
      unpostedDocuments: glActive ? unpostedDocuments : [],
    };
  }

  async closePeriod(tenantId: string, actorId: string, periodId: string, dto: ClosePeriodDto) {
    const period = await this.prisma.accountingPeriod.findFirst({ where: { id: periodId, tenantId } });
    if (!period) throw new NotFoundException('Accounting period not found');

    const allowedFrom = CLOSE_TRANSITIONS[dto.action];
    if (!allowedFrom.includes(period.status)) {
      throw new BadRequestException(`Cannot ${dto.action} a period in status ${period.status}`);
    }
    if (dto.action === 'LOCK' && !dto.reason) {
      throw new BadRequestException('Locking a period permanently requires a reason');
    }

    let overriddenBlockers: Array<{ type: string; detail: string; count: number }> = [];
    if (dto.action === 'CLOSE' || dto.action === 'LOCK') {
      const checklist = await this.closeChecklist(tenantId, periodId);
      if (!checklist.canClose) {
        if (!dto.force) {
          throw new BadRequestException(
            `PERIOD_CLOSE_BLOCKED: ${checklist.blockers.map((b) => b.detail).join('; ')}. Resolve the items or pass force=true with a reason.`,
          );
        }
        if (!dto.reason) {
          throw new BadRequestException('Force-closing a period with open items requires a reason');
        }
        overriddenBlockers = checklist.blockers;
      }
    }

    const target = CLOSE_TARGET[dto.action];

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.accountingPeriod.update({
        where: { id: periodId },
        data: { status: target as any, closedById: actorId, closedAt: new Date() },
      });
      await tx.periodCloseLog.create({
        data: { tenantId, periodId, action: dto.action, reason: dto.reason, actorId },
      });
      return u;
    });

    await this.audit.append({
      tenantId, userId: actorId, action: `PERIOD_${dto.action}`, actionCategory: 'ACCOUNTING',
      tableName: 'AccountingPeriod', recordId: periodId,
      beforeState: { status: period.status },
      afterState: {
        status: target, code: period.code,
        ...(overriddenBlockers.length > 0 && { forcedWithBlockers: overriddenBlockers }),
      },
      reason: dto.reason,
    });

    return updated;
  }

  async reopenPeriod(tenantId: string, actorId: string, periodId: string, dto: ReopenPeriodDto) {
    const period = await this.prisma.accountingPeriod.findFirst({ where: { id: periodId, tenantId } });
    if (!period) throw new NotFoundException('Accounting period not found');
    if (period.status === 'OPEN') throw new BadRequestException('Period is already open');
    if (period.status === 'LOCKED') {
      throw new BadRequestException('PERIOD_LOCKED: a permanently locked period can never be reopened');
    }
    if (dto.approvedById && dto.approvedById === actorId) {
      throw new BadRequestException('SOD_VIOLATION: the requester cannot approve their own period reopening');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.accountingPeriod.update({
        where: { id: periodId },
        data: { status: 'OPEN', reopenedById: actorId, reopenedAt: new Date() },
      });
      await tx.periodCloseLog.create({
        data: { tenantId, periodId, action: 'REOPEN', reason: dto.reason, actorId, approvedById: dto.approvedById },
      });
      return u;
    });

    await this.audit.append({
      tenantId, userId: actorId, action: 'PERIOD_REOPEN', actionCategory: 'ACCOUNTING',
      tableName: 'AccountingPeriod', recordId: periodId,
      beforeState: { status: period.status },
      afterState: { status: 'OPEN', code: period.code },
      reason: dto.reason,
      approvalReference: dto.approvedById,
    });

    return updated;
  }
}
