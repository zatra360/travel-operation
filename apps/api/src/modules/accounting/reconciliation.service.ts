import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const round4 = (n: number) => Math.round(n * 10000) / 10000;

const ISSUED_INVOICE_STATUSES = ['SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'];

export interface UnpostedDocument {
  documentType: string;
  id: string;
  number: string | null;
  status: string;
  amount: number;
  date: Date | null;
}

@Injectable()
export class ReconciliationService {
  constructor(private readonly prisma: PrismaService) {}

  private async glActivated(tenantId: string): Promise<boolean> {
    return (await this.prisma.gLAccount.count({ where: { tenantId } })) > 0;
  }

  private async controlBalance(tenantId: string, controlType: string, asOf: Date): Promise<number | null> {
    const account = await this.prisma.gLAccount.findFirst({
      where: { tenantId, controlAccountType: controlType, isActive: true },
      select: { id: true, normalBalance: true },
    });
    if (!account) return null;

    const rows = await this.prisma.$queryRaw<Array<{ debit: unknown; credit: unknown }>>`
      SELECT COALESCE(SUM(ji."functionalDebit"), 0) AS debit,
             COALESCE(SUM(ji."functionalCredit"), 0) AS credit
        FROM "JournalItem" ji
        JOIN "JournalEntry" je ON je."id" = ji."journalEntryId"
       WHERE ji."accountId" = ${account.id}
         AND je."status" IN ('POSTED', 'REVERSED')
         AND je."entryDate" <= ${asOf}`;

    const debit = Number(rows[0].debit);
    const credit = Number(rows[0].credit);
    return round4(account.normalBalance === 'DEBIT' ? debit - credit : credit - debit);
  }

  private async postedSourceIds(tenantId: string, sourceType: string): Promise<Set<string>> {
    const links = await this.prisma.journalEntryLink.findMany({
      where: { tenantId, sourceType, purpose: 'PRIMARY' },
      select: { sourceId: true },
    });
    return new Set(links.map((l) => l.sourceId));
  }

  /**
   * Documents in an accounting-impacting state that never produced a
   * posted journal (typically documents issued before GL activation,
   * or evidence of a broken flow).
   */
  async findUnpostedDocuments(tenantId: string, dateFrom?: Date, dateTo?: Date): Promise<UnpostedDocument[]> {
    const from = dateFrom ?? new Date('1900-01-01');
    const to = dateTo ?? new Date('9999-12-31');
    const results: UnpostedDocument[] = [];

    const [postedInvoices, postedPayments, postedExpenses, postedRefunds] = await Promise.all([
      this.postedSourceIds(tenantId, 'Invoice'),
      this.postedSourceIds(tenantId, 'Payment'),
      this.postedSourceIds(tenantId, 'Expense'),
      this.postedSourceIds(tenantId, 'RefundRequest'),
    ]);

    const invoices = await this.prisma.invoice.findMany({
      where: { tenantId, deletedAt: null, status: { in: ISSUED_INVOICE_STATUSES }, issuedAt: { gte: from, lte: to } },
      select: { id: true, invoiceNumber: true, status: true, totalAmount: true, issuedAt: true },
    });
    for (const inv of invoices) {
      if (!postedInvoices.has(inv.id)) {
        results.push({
          documentType: 'Invoice', id: inv.id, number: inv.invoiceNumber,
          status: inv.status, amount: Number(inv.totalAmount), date: inv.issuedAt,
        });
      }
    }

    const payments = await this.prisma.payment.findMany({
      where: { tenantId, status: { in: ['RECEIVED', 'PARTIALLY_REFUNDED', 'REFUNDED'] }, receivedAt: { gte: from, lte: to } },
      select: { id: true, reference: true, status: true, amount: true, receivedAt: true },
    });
    for (const p of payments) {
      if (!postedPayments.has(p.id)) {
        results.push({
          documentType: 'Payment', id: p.id, number: p.reference,
          status: p.status, amount: Number(p.amount), date: p.receivedAt,
        });
      }
    }

    const expenses = await this.prisma.expense.findMany({
      where: { tenantId, deletedAt: null, status: 'PAID', updatedAt: { gte: from, lte: to } },
      select: { id: true, expenseNumber: true, status: true, amount: true, expenseDate: true },
    });
    for (const e of expenses) {
      if (!postedExpenses.has(e.id)) {
        results.push({
          documentType: 'Expense', id: e.id, number: e.expenseNumber,
          status: e.status, amount: Number(e.amount), date: e.expenseDate,
        });
      }
    }

    const refunds = await this.prisma.refundRequest.findMany({
      where: { tenantId, status: 'PROCESSED', processedAt: { gte: from, lte: to } },
      select: { id: true, refundNumber: true, status: true, requestedAmount: true, approvedAmount: true, processedAt: true },
    });
    for (const r of refunds) {
      if (!postedRefunds.has(r.id)) {
        results.push({
          documentType: 'RefundRequest', id: r.id, number: r.refundNumber,
          status: r.status, amount: Number(r.approvedAmount ?? r.requestedAmount), date: r.processedAt,
        });
      }
    }

    return results;
  }

  /** Posted journals whose operational source document no longer exists. */
  async findOrphanJournals(tenantId: string) {
    const links = await this.prisma.journalEntryLink.findMany({
      where: { tenantId, purpose: 'PRIMARY', sourceType: { in: ['Invoice', 'Payment', 'Expense', 'RefundRequest'] } },
      include: { journalEntry: { select: { id: true, journalNumber: true, status: true } } },
    });

    const byType = new Map<string, string[]>();
    for (const link of links) {
      const list = byType.get(link.sourceType) ?? [];
      list.push(link.sourceId);
      byType.set(link.sourceType, list);
    }

    const existing = new Set<string>();
    const collect = (type: string, rows: Array<{ id: string }>) =>
      rows.forEach((r) => existing.add(`${type}:${r.id}`));

    if (byType.has('Invoice')) {
      collect('Invoice', await this.prisma.invoice.findMany({
        where: { tenantId, id: { in: byType.get('Invoice')! } }, select: { id: true },
      }));
    }
    if (byType.has('Payment')) {
      collect('Payment', await this.prisma.payment.findMany({
        where: { tenantId, id: { in: byType.get('Payment')! } }, select: { id: true },
      }));
    }
    if (byType.has('Expense')) {
      collect('Expense', await this.prisma.expense.findMany({
        where: { tenantId, id: { in: byType.get('Expense')! } }, select: { id: true },
      }));
    }
    if (byType.has('RefundRequest')) {
      collect('RefundRequest', await this.prisma.refundRequest.findMany({
        where: { tenantId, id: { in: byType.get('RefundRequest')! } }, select: { id: true },
      }));
    }

    return links
      .filter((l) => !existing.has(`${l.sourceType}:${l.sourceId}`))
      .map((l) => ({
        sourceType: l.sourceType,
        sourceId: l.sourceId,
        journalEntryId: l.journalEntry.id,
        journalNumber: l.journalEntry.journalNumber,
        journalStatus: l.journalEntry.status,
      }));
  }

  /**
   * Bank sub-ledger vs. the BANK control account:
   *   operational truth = SUM(currentBalance) over active bank accounts
   *   general ledger    = BANK control account balance from posted journals
   * Unposted received payments are listed as the primary explanation for
   * differences (typically documents from before GL activation).
   */
  async reconcileBank(tenantId: string) {
    const glActive = await this.glActivated(tenantId);
    const now = new Date('9999-12-31');

    const bankAccounts = await this.prisma.bankAccount.findMany({
      where: { tenantId, deletedAt: null, isActive: true },
      select: { id: true, bankName: true, accountName: true, accountNumber: true, currencyCode: true, currentBalance: true },
    });
    const operationalBalance = round4(bankAccounts.reduce((s, a) => s + Number(a.currentBalance), 0));

    const glBalance = glActive ? await this.controlBalance(tenantId, 'BANK', now) : null;
    const unpostedPayments = (await this.findUnpostedDocuments(tenantId)).filter((d) => d.documentType === 'Payment');
    const difference = glBalance !== null ? round4(glBalance - operationalBalance) : null;

    return {
      glActivated: glActive,
      operationalBalance,
      glBalance,
      difference,
      isReconciled: glActive && difference === 0 && unpostedPayments.length === 0,
      bankAccounts: bankAccounts.map((a) => ({ ...a, currentBalance: Number(a.currentBalance) })),
      unpostedPayments,
    };
  }

  /**
   * Accounts-receivable sub-ledger vs. the AR control account:
   *   sub-ledger truth  = SUM(dueAmount) over issued, non-cancelled invoices
   *   general ledger    = AR control account balance from posted journals
   */
  async reconcileAR(tenantId: string, asOf?: string) {
    const to = asOf ? new Date(asOf) : new Date('9999-12-31');
    const glActive = await this.glActivated(tenantId);

    const invoiceAgg = await this.prisma.invoice.aggregate({
      where: { tenantId, deletedAt: null, status: { in: ISSUED_INVOICE_STATUSES }, issuedAt: { lte: to } },
      _sum: { dueAmount: true },
    });
    const subLedgerBalance = round4(Number(invoiceAgg._sum.dueAmount ?? 0));

    const glBalance = glActive ? await this.controlBalance(tenantId, 'ACCOUNTS_RECEIVABLE', to) : null;
    const unposted = await this.findUnpostedDocuments(tenantId, undefined, to);
    const orphanJournals = await this.findOrphanJournals(tenantId);

    const arRelevant = unposted.filter((u) => u.documentType === 'Invoice' || u.documentType === 'Payment');
    const difference = glBalance !== null ? round4(glBalance - subLedgerBalance) : null;

    return {
      asOf: to,
      glActivated: glActive,
      subLedgerBalance,
      glBalance,
      difference,
      isReconciled: glActive && difference === 0 && arRelevant.length === 0 && orphanJournals.length === 0,
      unpostedDocuments: unposted,
      orphanJournals,
    };
  }
}
