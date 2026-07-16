import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const round4 = (n: number) => Math.round(n * 10000) / 10000;

interface AccountBalanceRow {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  normalBalance: string;
  debit: unknown;
  credit: unknown;
}

@Injectable()
export class FinancialReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private async accountBalances(tenantId: string, from: Date, to: Date) {
    const rows = await this.prisma.$queryRaw<AccountBalanceRow[]>`
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

    return rows.map((r) => {
      const debit = Number(r.debit);
      const credit = Number(r.credit);
      return {
        id: r.id,
        accountCode: r.accountCode,
        accountName: r.accountName,
        accountType: r.accountType,
        normalBalance: r.normalBalance,
        debit,
        credit,
        balance: round4(r.normalBalance === 'DEBIT' ? debit - credit : credit - debit),
      };
    });
  }

  async incomeStatement(tenantId: string, dateFrom?: string, dateTo?: string) {
    const from = dateFrom ? new Date(dateFrom) : new Date('1900-01-01');
    const to = dateTo ? new Date(dateTo) : new Date('9999-12-31');
    const balances = await this.accountBalances(tenantId, from, to);

    const section = (type: string) => balances.filter((b) => b.accountType === type && (b.debit !== 0 || b.credit !== 0));
    const sum = (accounts: ReturnType<typeof section>) => round4(accounts.reduce((s, a) => s + a.balance, 0));

    const revenue = section('REVENUE');
    const cogs = section('COGS');
    const expenses = section('EXPENSE');
    const otherIncome = section('OTHER_INCOME');
    const otherExpense = section('OTHER_EXPENSE');

    const totalRevenue = sum(revenue);
    const totalCogs = sum(cogs);
    const grossProfit = round4(totalRevenue - totalCogs);
    const totalExpenses = sum(expenses);
    const operatingProfit = round4(grossProfit - totalExpenses);
    const totalOtherIncome = sum(otherIncome);
    const totalOtherExpense = sum(otherExpense);
    const netProfit = round4(operatingProfit + totalOtherIncome - totalOtherExpense);

    return {
      period: { from, to },
      revenue: { accounts: revenue, total: totalRevenue },
      costOfServices: { accounts: cogs, total: totalCogs },
      grossProfit,
      expenses: { accounts: expenses, total: totalExpenses },
      operatingProfit,
      otherIncome: { accounts: otherIncome, total: totalOtherIncome },
      otherExpense: { accounts: otherExpense, total: totalOtherExpense },
      netProfit,
    };
  }

  async balanceSheet(tenantId: string, asOf?: string) {
    const from = new Date('1900-01-01');
    const to = asOf ? new Date(asOf) : new Date('9999-12-31');
    const balances = await this.accountBalances(tenantId, from, to);

    const withActivity = (types: string[]) =>
      balances.filter((b) => types.includes(b.accountType) && (b.debit !== 0 || b.credit !== 0));
    const sum = (accounts: Array<{ balance: number }>) => round4(accounts.reduce((s, a) => s + a.balance, 0));

    const assets = withActivity(['ASSET']);
    const liabilities = withActivity(['LIABILITY']);
    const equity = withActivity(['EQUITY']);

    const pnlTypes = ['REVENUE', 'COGS', 'EXPENSE', 'OTHER_INCOME', 'OTHER_EXPENSE'];
    const currentEarnings = round4(
      balances
        .filter((b) => pnlTypes.includes(b.accountType))
        .reduce((s, b) => {
          const sign = b.accountType === 'REVENUE' || b.accountType === 'OTHER_INCOME' ? 1 : -1;
          return s + sign * b.balance;
        }, 0),
    );

    const totalAssets = sum(assets);
    const totalLiabilities = sum(liabilities);
    const totalEquity = round4(sum(equity) + currentEarnings);

    return {
      asOf: to,
      assets: { accounts: assets, total: totalAssets },
      liabilities: { accounts: liabilities, total: totalLiabilities },
      equity: { accounts: equity, currentPeriodEarnings: currentEarnings, total: totalEquity },
      totalLiabilitiesAndEquity: round4(totalLiabilities + totalEquity),
      isBalanced: totalAssets === round4(totalLiabilities + totalEquity),
    };
  }

  async generalLedger(tenantId: string, accountId: string, dateFrom?: string, dateTo?: string) {
    const account = await this.prisma.gLAccount.findFirst({ where: { id: accountId, tenantId } });
    if (!account) throw new NotFoundException('GL account not found');

    const from = dateFrom ? new Date(dateFrom) : new Date('1900-01-01');
    const to = dateTo ? new Date(dateTo) : new Date('9999-12-31');

    const openingRows = await this.prisma.$queryRaw<Array<{ debit: unknown; credit: unknown }>>`
      SELECT COALESCE(SUM(ji."functionalDebit"), 0) AS debit,
             COALESCE(SUM(ji."functionalCredit"), 0) AS credit
        FROM "JournalItem" ji
        JOIN "JournalEntry" je ON je."id" = ji."journalEntryId"
       WHERE ji."accountId" = ${accountId}
         AND je."status" IN ('POSTED', 'REVERSED')
         AND je."entryDate" < ${from}`;

    const sign = account.normalBalance === 'DEBIT' ? 1 : -1;
    const openingBalance = round4(sign * (Number(openingRows[0].debit) - Number(openingRows[0].credit)));

    const items = await this.prisma.journalItem.findMany({
      where: {
        accountId,
        tenantId,
        journalEntry: { status: { in: ['POSTED', 'REVERSED'] }, entryDate: { gte: from, lte: to } },
      },
      include: {
        journalEntry: {
          select: { journalNumber: true, entryDate: true, journalType: true, sourceType: true, sourceId: true, sourceNumber: true, description: true },
        },
      },
      orderBy: [{ journalEntry: { entryDate: 'asc' } }, { createdAt: 'asc' }],
    });

    let running = openingBalance;
    const lines = items.map((i) => {
      const debit = Number(i.functionalDebit);
      const credit = Number(i.functionalCredit);
      running = round4(running + sign * (debit - credit));
      return {
        journalNumber: i.journalEntry.journalNumber,
        entryDate: i.journalEntry.entryDate,
        journalType: i.journalEntry.journalType,
        sourceType: i.journalEntry.sourceType,
        sourceNumber: i.journalEntry.sourceNumber,
        description: i.description ?? i.journalEntry.description,
        debit,
        credit,
        balance: running,
      };
    });

    return {
      account: {
        id: account.id, accountCode: account.accountCode, accountName: account.accountName,
        accountType: account.accountType, normalBalance: account.normalBalance,
      },
      period: { from, to },
      openingBalance,
      lines,
      closingBalance: running,
    };
  }
}
