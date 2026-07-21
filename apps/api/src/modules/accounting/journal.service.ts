import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { mapAccountingDbError } from './accounting-audit.service';
import { CreateJournalDto, QueryJournalDto, ReverseJournalDto } from './dto/journal.dto';

const round4 = (n: number) => Math.round(n * 10000) / 10000;

@Injectable()
export class JournalService {
  constructor(private readonly prisma: PrismaService) {}

  async createDraft(tenantId: string, actorId: string, branchId: string | undefined, dto: CreateJournalDto) {
    const exchangeRate = dto.exchangeRate ?? 1;
    const currencyCode = dto.currencyCode ?? 'USD';
    const functionalCurrencyCode = dto.functionalCurrencyCode ?? currencyCode;

    for (const [i, line] of dto.lines.entries()) {
      const debitSide = line.debit > 0;
      const creditSide = line.credit > 0;
      if (debitSide === creditSide) {
        throw new BadRequestException(
          `Line ${i + 1}: each journal line must carry either a positive debit or a positive credit, never both or neither`,
        );
      }
    }

    const accountIds = [...new Set(dto.lines.map((l) => l.accountId))];
    const accounts = await this.prisma.gLAccount.findMany({
      where: { id: { in: accountIds }, tenantId, isActive: true },
      select: { id: true },
    });
    if (accounts.length !== accountIds.length) {
      throw new BadRequestException('One or more lines reference missing or inactive accounts');
    }

    return this.prisma.$transaction(async (tx) => {
      const entry = await tx.journalEntry.create({
        data: {
          tenantId,
          branchId,
          journalType: dto.journalType ?? 'MANUAL',
          entryDate: new Date(dto.entryDate),
          currencyCode,
          exchangeRate,
          functionalCurrencyCode,
          sourceType: dto.sourceType,
          sourceId: dto.sourceId,
          sourceNumber: dto.sourceNumber,
          description: dto.description,
          createdById: actorId,
        },
      });

      let lineNumber = 1;
      for (const line of dto.lines) {
        await tx.journalItem.create({
          data: {
            journalEntryId: entry.id,
            tenantId,
            lineNumber: lineNumber++,
            accountId: line.accountId,
            partyType: line.partyType,
            partyId: line.partyId,
            costCenter: line.costCenter,
            projectId: line.projectId,
            taxCodeId: line.taxCodeId,
            description: line.description,
            debit: line.debit,
            credit: line.credit,
            transactionCurrency: currencyCode,
            transactionAmount: line.debit > 0 ? line.debit : line.credit,
            exchangeRate,
            functionalDebit: round4(line.debit * exchangeRate),
            functionalCredit: round4(line.credit * exchangeRate),
          },
        });
      }

      return tx.journalEntry.findUnique({
        where: { id: entry.id },
        include: { items: { orderBy: { lineNumber: 'asc' } } },
      });
    });
  }

  async findAll(tenantId: string, query: QueryJournalDto) {
    const page = Number(query.page ?? 1);
    const limit = Math.min(Number(query.limit ?? 50), 200);
    const skip = (page - 1) * limit;
    const where: any = { tenantId };
    if (query.status) where.status = query.status;
    if (query.journalType) where.journalType = query.journalType;
    if (query.dateFrom || query.dateTo) {
      where.entryDate = {};
      if (query.dateFrom) where.entryDate.gte = new Date(query.dateFrom);
      if (query.dateTo) where.entryDate.lte = new Date(query.dateTo);
    }
    if (query.search) {
      where.OR = [
        { journalNumber: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { sourceNumber: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.journalEntry.findMany({
        where,
        orderBy: [{ postedAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
        include: { items: { select: { functionalDebit: true } } },
      }),
      this.prisma.journalEntry.count({ where }),
    ]);
    return {
      data: data.map((e) => ({
        ...e,
        totalAmount: e.items.reduce((s, i) => s + Number(i.functionalDebit), 0),
        items: undefined,
      })),
      total, page, limit, totalPages: Math.ceil(total / limit),
    };
  }

  async findById(tenantId: string, id: string) {
    const entry = await this.prisma.journalEntry.findFirst({
      where: { id, tenantId },
      include: {
        items: { orderBy: { lineNumber: 'asc' }, include: { account: { select: { accountCode: true, accountName: true } } } },
        accountingPeriod: { select: { code: true, status: true } },
        links: true,
        reversalOf: { select: { id: true, journalNumber: true } },
      },
    });
    if (!entry) throw new NotFoundException('Journal entry not found');
    return entry;
  }

  async updateDraft(tenantId: string, actorId: string, id: string, dto: CreateJournalDto) {
    const entry = await this.prisma.journalEntry.findFirst({ where: { id, tenantId } });
    if (!entry) throw new NotFoundException('Journal entry not found');
    if (entry.status !== 'DRAFT') {
      throw new BadRequestException(`Only DRAFT journal entries can be edited (current: ${entry.status})`);
    }
    await this.prisma.journalItem.deleteMany({ where: { journalEntryId: id } });
    await this.prisma.journalEntry.delete({ where: { id } });
    return this.createDraft(tenantId, actorId, entry.branchId ?? undefined, dto);
  }

  async approve(tenantId: string, actorId: string, id: string) {
    const entry = await this.prisma.journalEntry.findFirst({ where: { id, tenantId } });
    if (!entry) throw new NotFoundException('Journal entry not found');
    if (entry.status !== 'DRAFT' && entry.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException(`Journal entry cannot be approved from status ${entry.status}`);
    }
    if (entry.createdById === actorId) {
      throw new BadRequestException('SOD_VIOLATION: the creator of a journal entry cannot approve it');
    }
    return this.prisma.journalEntry.update({
      where: { id },
      data: { status: 'APPROVED', approvedById: actorId, approvedAt: new Date() },
    });
  }

  async post(tenantId: string, actorId: string, id: string, idempotencyKey?: string) {
    const endpoint = 'journal.post';
    const payloadHash = createHash('sha256').update(`${endpoint}:${id}`).digest('hex');

    if (idempotencyKey) {
      const existing = await this.prisma.idempotencyRecord.findUnique({
        where: { tenantId_endpoint_idempotencyKey: { tenantId, endpoint, idempotencyKey } },
      });
      if (existing) {
        if (existing.payloadHash !== payloadHash) {
          throw new ConflictException('Idempotency key was already used with a different payload');
        }
        if (existing.status === 'COMPLETED') return existing.responseBody;
        if (existing.status === 'IN_PROGRESS') {
          throw new ConflictException('A request with this idempotency key is still being processed');
        }
      } else {
        try {
          await this.prisma.idempotencyRecord.create({
            data: { tenantId, endpoint, idempotencyKey, payloadHash, createdById: actorId },
          });
        } catch (err: any) {
          if (err?.code === 'P2002') {
            throw new ConflictException('A concurrent request with this idempotency key is being processed');
          }
          throw err;
        }
      }
    }

    try {
      const rows = await this.prisma.$queryRaw<Array<{ journal_number: string }>>`
        SELECT fn_post_journal_entry(${id}, ${tenantId}, ${actorId}, false) AS journal_number`;
      const result = { id, journalNumber: rows[0].journal_number, status: 'POSTED' };

      if (idempotencyKey) {
        await this.prisma.idempotencyRecord.update({
          where: { tenantId_endpoint_idempotencyKey: { tenantId, endpoint, idempotencyKey } },
          data: { status: 'COMPLETED', responseBody: result, recordType: 'JournalEntry', recordId: id, completedAt: new Date() },
        });
      }
      return result;
    } catch (err) {
      if (idempotencyKey) {
        await this.prisma.idempotencyRecord.update({
          where: { tenantId_endpoint_idempotencyKey: { tenantId, endpoint, idempotencyKey } },
          data: { status: 'FAILED', completedAt: new Date() },
        }).catch(() => {});
      }
      mapAccountingDbError(err);
    }
  }

  async reverse(tenantId: string, actorId: string, id: string, dto: ReverseJournalDto) {
    try {
      const rows = await this.prisma.$queryRaw<Array<{ reversal_id: string }>>`
        SELECT fn_reverse_journal_entry(
          ${id}, ${tenantId}, ${actorId}, ${dto.reason},
          ${dto.entryDate ? new Date(dto.entryDate) : null}::timestamp
        ) AS reversal_id`;
      return this.findById(tenantId, rows[0].reversal_id);
    } catch (err) {
      mapAccountingDbError(err);
    }
  }

  async trialBalance(tenantId: string, dateFrom?: string, dateTo?: string) {
    const from = dateFrom ? new Date(dateFrom) : new Date('1900-01-01');
    const to = dateTo ? new Date(dateTo) : new Date('9999-12-31');

    const rows = await this.prisma.$queryRaw<Array<{
      id: string; accountCode: string; accountName: string; accountType: string;
      normalBalance: string; debit: unknown; credit: unknown;
    }>>`
      SELECT a."id", a."accountCode", a."accountName", a."accountType"::text AS "accountType",
             a."normalBalance"::text AS "normalBalance",
             COALESCE(SUM(ji."functionalDebit"), 0) AS debit,
             COALESCE(SUM(ji."functionalCredit"), 0) AS credit
        FROM "GLAccount" a
        LEFT JOIN "JournalItem" ji
          ON ji."accountId" = a."id"
         AND EXISTS (
           SELECT 1 FROM "JournalEntry" je
            WHERE je."id" = ji."journalEntryId"
              AND je."status" IN ('POSTED', 'REVERSED')
              AND je."entryDate" >= ${from}
              AND je."entryDate" <= ${to}
         )
       WHERE a."tenantId" = ${tenantId}
       GROUP BY a."id", a."accountCode", a."accountName", a."accountType", a."normalBalance"
       ORDER BY a."accountCode" ASC`;

    const accounts = rows.map((r) => {
      const debit = Number(r.debit);
      const credit = Number(r.credit);
      const balance = r.normalBalance === 'DEBIT' ? debit - credit : credit - debit;
      return { ...r, debit, credit, balance };
    });

    const totals = accounts.reduce(
      (t, a) => ({ debit: round4(t.debit + a.debit), credit: round4(t.credit + a.credit) }),
      { debit: 0, credit: 0 },
    );

    return { accounts, totals, isBalanced: totals.debit === totals.credit };
  }
}
