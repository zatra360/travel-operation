import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { mapAccountingDbError } from './accounting-audit.service';

type Db = PrismaService | Prisma.TransactionClient;

interface GLLine {
  accountId: string;
  debit: number;
  credit: number;
  description?: string;
  partyType?: string;
  partyId?: string;
}

interface PostParams {
  tenantId: string;
  actorId: string;
  branchId?: string | null;
  journalType: string;
  entryDate: Date;
  currencyCode: string;
  exchangeRate: number;
  functionalCurrencyCode: string;
  sourceType: string;
  sourceId: string;
  sourceNumber?: string | null;
  description: string;
  lines: GLLine[];
}

const round4 = (n: number) => Math.round(n * 10000) / 10000;

/**
 * Bridges operational documents (invoices, payments, expenses, refunds)
 * into the hardened double-entry ledger.
 *
 * Activation semantics (fail-closed once active):
 *  - Tenant has NO GLAccount rows  -> GL not activated, posting is skipped.
 *  - Tenant HAS GLAccount rows     -> required control-account mappings and
 *    an open accounting period are mandatory; missing mappings abort the
 *    surrounding business transaction.
 */
@Injectable()
export class GLPostingService {
  private readonly logger = new Logger(GLPostingService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async isActivated(db: Db, tenantId: string): Promise<boolean> {
    const count = await db.gLAccount.count({ where: { tenantId } });
    return count > 0;
  }

  private async resolveControl(db: Db, tenantId: string, controlType: string): Promise<string> {
    const account = await db.gLAccount.findFirst({
      where: { tenantId, controlAccountType: controlType, isActive: true },
      select: { id: true },
    });
    if (!account) {
      throw new BadRequestException(
        `ACCOUNT_MAPPING_MISSING: no active GL account is mapped as ${controlType}; configure the chart of accounts before posting`,
      );
    }
    return account.id;
  }

  private async resolveRevenue(db: Db, tenantId: string): Promise<string> {
    const account = await db.gLAccount.findFirst({
      where: { tenantId, accountType: 'REVENUE', isActive: true },
      orderBy: { accountCode: 'asc' },
      select: { id: true },
    });
    if (!account) {
      throw new BadRequestException('ACCOUNT_MAPPING_MISSING: no active REVENUE account exists in the chart of accounts');
    }
    return account.id;
  }

  private async resolveExpense(db: Db, tenantId: string, category?: string | null): Promise<string> {
    if (category) {
      const byName = await db.gLAccount.findFirst({
        where: { tenantId, accountType: 'EXPENSE', isActive: true, accountName: { equals: category, mode: 'insensitive' } },
        select: { id: true },
      });
      if (byName) return byName.id;
    }
    const fallback = await db.gLAccount.findFirst({
      where: { tenantId, accountType: { in: ['EXPENSE', 'OTHER_EXPENSE'] }, isActive: true, controlAccountType: null },
      orderBy: [{ accountType: 'desc' }, { accountCode: 'desc' }],
      select: { id: true },
    });
    if (!fallback) {
      throw new BadRequestException('ACCOUNT_MAPPING_MISSING: no active EXPENSE account exists in the chart of accounts');
    }
    return fallback.id;
  }

  private async resolveSettlementAccount(db: Db, tenantId: string, paymentMethod?: string | null): Promise<string> {
    const control = paymentMethod === 'CASH' ? 'CASH' : 'BANK';
    return this.resolveControl(db, tenantId, control);
  }

  private async createAndPost(db: Db, params: PostParams): Promise<{ journalEntryId: string; journalNumber: string } | null> {
    // If a PRIMARY link already exists for this source document, use that
    // journal (e.g. an accrual already posted for this expense; this
    // settlement call is the second one). Otherwise, claim the PRIMARY slot
    // inside the posting transaction.
    if (params.sourceType && params.sourceId) {
      const existingPrimary = await db.journalEntryLink.findUnique({
        where: {
          tenantId_sourceType_sourceId_purpose: {
            tenantId: params.tenantId,
            sourceType: params.sourceType,
            sourceId: params.sourceId,
            purpose: 'PRIMARY',
          },
        },
        include: { journalEntry: { select: { id: true, journalNumber: true } } },
      });
      if (existingPrimary) {
        return { journalEntryId: existingPrimary.journalEntry.id, journalNumber: existingPrimary.journalEntry.journalNumber ?? '' };
      }
    }

    const entry = await db.journalEntry.create({
      data: {
        tenantId: params.tenantId,
        branchId: params.branchId ?? null,
        journalType: params.journalType,
        entryDate: params.entryDate,
        currencyCode: params.currencyCode,
        exchangeRate: params.exchangeRate,
        functionalCurrencyCode: params.functionalCurrencyCode,
        sourceType: params.sourceType,
        sourceId: params.sourceId,
        sourceNumber: params.sourceNumber ?? null,
        description: params.description,
        createdById: params.actorId,
      },
    });

    let lineNumber = 1;
    for (const line of params.lines) {
      await db.journalItem.create({
        data: {
          journalEntryId: entry.id,
          tenantId: params.tenantId,
          lineNumber: lineNumber++,
          accountId: line.accountId,
          partyType: line.partyType,
          partyId: line.partyId,
          description: line.description ?? params.description,
          debit: round4(line.debit),
          credit: round4(line.credit),
          transactionCurrency: params.currencyCode,
          transactionAmount: line.debit > 0 ? round4(line.debit) : round4(line.credit),
          exchangeRate: params.exchangeRate,
          functionalDebit: round4(line.debit * params.exchangeRate),
          functionalCredit: round4(line.credit * params.exchangeRate),
        },
      });
    }

    try {
      const rows = await db.$queryRaw<Array<{ journal_number: string }>>`
        SELECT fn_post_journal_entry(${entry.id}, ${params.tenantId}, ${params.actorId}, true) AS journal_number`;
      return { journalEntryId: entry.id, journalNumber: rows[0].journal_number };
    } catch (err) {
      mapAccountingDbError(err);
    }
  }

  /** Dr Accounts Receivable / Cr Revenue / Cr Tax Payable */
  async postCustomerInvoiceIssued(db: Db | null, tenantId: string, actorId: string, invoice: {
    id: string; invoiceNumber: string; branchId?: string | null; clientId?: string | null;
    totalAmount: unknown; taxAmount: unknown; currencyCode: string; exchangeRate: unknown;
    baseCurrencyCode?: string | null; issuedAt?: Date | null;
  }) {
    const client = db ?? this.prisma;
    if (!(await this.isActivated(client, tenantId))) return null;

    const total = Number(invoice.totalAmount);
    const tax = Number(invoice.taxAmount ?? 0);
    const revenue = round4(total - tax);
    if (total <= 0) {
      this.logger.warn(`Invoice ${invoice.invoiceNumber} has non-positive total; GL posting skipped`);
      return null;
    }

    const arAccountId = await this.resolveControl(client, tenantId, 'ACCOUNTS_RECEIVABLE');
    const revenueAccountId = await this.resolveRevenue(client, tenantId);
    const lines: GLLine[] = [
      { accountId: arAccountId, debit: total, credit: 0, partyType: invoice.clientId ? 'CUSTOMER' : undefined, partyId: invoice.clientId ?? undefined },
      { accountId: revenueAccountId, debit: 0, credit: revenue },
    ];
    if (tax > 0) {
      const taxAccountId = await this.resolveControl(client, tenantId, 'TAX_PAYABLE');
      lines.push({ accountId: taxAccountId, debit: 0, credit: tax });
    }

    return this.createAndPost(client, {
      tenantId, actorId,
      branchId: invoice.branchId,
      journalType: 'SALES',
      entryDate: invoice.issuedAt ?? new Date(),
      currencyCode: invoice.currencyCode,
      exchangeRate: Number(invoice.exchangeRate ?? 1),
      functionalCurrencyCode: invoice.baseCurrencyCode ?? invoice.currencyCode,
      sourceType: 'Invoice',
      sourceId: invoice.id,
      sourceNumber: invoice.invoiceNumber,
      description: `Invoice ${invoice.invoiceNumber} issued`,
      lines,
    });
  }

  /** Dr Bank/Cash / Cr Accounts Receivable */
  async postPaymentReceived(db: Db | null, tenantId: string, actorId: string, payment: {
    id: string; branchId?: string | null; clientId?: string | null; amount: unknown;
    currencyCode: string; exchangeRate: unknown; baseCurrencyCode?: string | null;
    paymentMethod?: string | null; reference?: string | null; receivedAt?: Date | null;
  }) {
    const client = db ?? this.prisma;
    if (!(await this.isActivated(client, tenantId))) return null;

    const amount = Number(payment.amount);
    if (amount <= 0) return null;

    const settlementAccountId = await this.resolveSettlementAccount(client, tenantId, payment.paymentMethod);
    const arAccountId = await this.resolveControl(client, tenantId, 'ACCOUNTS_RECEIVABLE');

    return this.createAndPost(client, {
      tenantId, actorId,
      branchId: payment.branchId,
      journalType: 'RECEIPT',
      entryDate: payment.receivedAt ?? new Date(),
      currencyCode: payment.currencyCode,
      exchangeRate: Number(payment.exchangeRate ?? 1),
      functionalCurrencyCode: payment.baseCurrencyCode ?? payment.currencyCode,
      sourceType: 'Payment',
      sourceId: payment.id,
      sourceNumber: payment.reference,
      description: `Payment received${payment.reference ? ` (${payment.reference})` : ''}`,
      lines: [
        { accountId: settlementAccountId, debit: amount, credit: 0 },
        { accountId: arAccountId, debit: 0, credit: amount, partyType: payment.clientId ? 'CUSTOMER' : undefined, partyId: payment.clientId ?? undefined },
      ],
    });
  }

  /** Dr Expense / Cr Accounts Payable — accrual on expense approval (two-stage accounting). */
  async postExpenseAccrual(db: Db | null, tenantId: string, actorId: string, expense: {
    id: string; expenseNumber: string; branchId?: string | null; category?: string | null;
    vendorId?: string | null; amount: unknown; currencyCode: string; expenseDate?: Date | null;
  }) {
    const client = db ?? this.prisma;
    if (!(await this.isActivated(client, tenantId))) return null;

    const amount = Number(expense.amount);
    if (amount <= 0) return null;

    const expenseAccountId = await this.resolveExpense(client, tenantId, expense.category);
    const apAccountId = await this.resolveControl(client, tenantId, 'ACCOUNTS_PAYABLE');

    return this.createAndPost(client, {
      tenantId, actorId,
      branchId: expense.branchId,
      journalType: 'EXPENSE',
      entryDate: new Date(),
      currencyCode: expense.currencyCode,
      exchangeRate: 1,
      functionalCurrencyCode: expense.currencyCode,
      sourceType: 'Expense',
      sourceId: expense.id,
      sourceNumber: expense.expenseNumber,
      description: `Expense ${expense.expenseNumber} approved${expense.category ? ` (${expense.category})` : ''} — accrual`,
      lines: [
        { accountId: expenseAccountId, debit: amount, credit: 0, partyType: expense.vendorId ? 'VENDOR' : undefined, partyId: expense.vendorId ?? undefined },
        { accountId: apAccountId, debit: 0, credit: amount },
      ],
    });
  }

  /** Dr Accounts Payable / Cr Cash or Bank — settlement of an accrued payable. */
  async postExpenseSettlement(db: Db | null, tenantId: string, actorId: string, expense: {
    id: string; expenseNumber: string; branchId?: string | null; amount: unknown;
    currencyCode: string; vendorId?: string | null; paymentMethod?: string | null;
  }) {
    const client = db ?? this.prisma;
    if (!(await this.isActivated(client, tenantId))) return null;

    const amount = Number(expense.amount);
    if (amount <= 0) return null;

    // Idempotency: one settlement journal per expense.
    const existingSettlement = await client.journalEntryLink.findUnique({
      where: {
        tenantId_sourceType_sourceId_purpose: {
          tenantId, sourceType: 'Expense', sourceId: expense.id, purpose: 'SETTLEMENT',
        },
      },
      include: { journalEntry: { select: { id: true, journalNumber: true } } },
    });
    if (existingSettlement) {
      return { journalEntryId: existingSettlement.journalEntry.id, journalNumber: existingSettlement.journalEntry.journalNumber ?? '' };
    }

    const apAccountId = await this.resolveControl(client, tenantId, 'ACCOUNTS_PAYABLE');
    const settlementAccountId = await this.resolveSettlementAccount(client, tenantId, expense.paymentMethod);

    // Settlements do NOT go through createAndPost (which guarantees
    // a PRIMARY link).  Instead they build the journal inline so they
    // can create a SETTLEMENT-purpose link afterwards.
    const entry = await client.journalEntry.create({
      data: {
        tenantId,
        branchId: expense.branchId ?? null,
        journalType: 'EXPENSE',
        entryDate: new Date(),
        currencyCode: expense.currencyCode,
        exchangeRate: 1,
        functionalCurrencyCode: expense.currencyCode,
        description: `Expense ${expense.expenseNumber} paid — settlement`,
        createdById: actorId,
      },
    });

    let lineNumber = 1;
    for (const line of [
      { accountId: apAccountId, debit: amount, credit: 0, partyType: expense.vendorId ? 'VENDOR' : undefined, partyId: expense.vendorId ?? undefined },
      { accountId: settlementAccountId, debit: 0, credit: amount },
    ]) {
      await client.journalItem.create({
        data: {
          journalEntryId: entry.id,
          tenantId,
          lineNumber: lineNumber++,
          accountId: line.accountId,
          partyType: line.partyType,
          partyId: line.partyId,
          description: `Settlement of ${expense.expenseNumber}`,
          debit: round4(line.debit),
          credit: round4(line.credit),
          transactionCurrency: expense.currencyCode,
          transactionAmount: line.debit > 0 ? round4(line.debit) : round4(line.credit),
          exchangeRate: 1,
          functionalDebit: round4(line.debit),
          functionalCredit: round4(line.credit),
        },
      });
    }

    try {
      const rows = await client.$queryRaw<Array<{ journal_number: string }>>`
        SELECT fn_post_journal_entry(${entry.id}, ${tenantId}, ${actorId}, true) AS journal_number`;

      await client.journalEntryLink.create({
        data: { tenantId, journalEntryId: entry.id, sourceType: 'Expense', sourceId: expense.id, purpose: 'SETTLEMENT', createdAt: new Date() },
      });

      return { journalEntryId: entry.id, journalNumber: rows[0].journal_number };
    } catch (err) {
      mapAccountingDbError(err);
    }
  }

  /**
   * @deprecated Used only by direct-paid (single-stage) expenses.
   * New accrual flows post via postExpenseAccrual →
   * postExpenseSettlement and bypass this legacy path.
   */
  async postExpensePaid(db: Db | null, tenantId: string, actorId: string, expense: {
    id: string; expenseNumber: string; branchId?: string | null; category?: string | null;
    vendorId?: string | null; amount: unknown; currencyCode: string; expenseDate?: Date | null;
  }) {
    const client = db ?? this.prisma;
    if (!(await this.isActivated(client, tenantId))) return null;

    const amount = Number(expense.amount);
    if (amount <= 0) return null;

    const expenseAccountId = await this.resolveExpense(client, tenantId, expense.category);
    const cashAccountId = await this.resolveControl(client, tenantId, 'CASH');

    return this.createAndPost(client, {
      tenantId, actorId,
      branchId: expense.branchId,
      journalType: 'EXPENSE',
      entryDate: new Date(),
      currencyCode: expense.currencyCode,
      exchangeRate: 1,
      functionalCurrencyCode: expense.currencyCode,
      sourceType: 'Expense',
      sourceId: expense.id,
      sourceNumber: expense.expenseNumber,
      description: `Expense ${expense.expenseNumber} paid${expense.category ? ` (${expense.category})` : ''}`,
      lines: [
        { accountId: expenseAccountId, debit: amount, credit: 0, partyType: expense.vendorId ? 'VENDOR' : undefined, partyId: expense.vendorId ?? undefined },
        { accountId: cashAccountId, debit: 0, credit: amount },
      ],
    });
  }

  /** Dr Revenue (contra) / Cr Bank */
  async postRefundProcessed(db: Db | null, tenantId: string, actorId: string, refund: {
    id: string; refundNumber: string; branchId?: string | null; clientId?: string | null;
    amount: number; currencyCode: string;
  }) {
    const client = db ?? this.prisma;
    if (!(await this.isActivated(client, tenantId))) return null;
    if (refund.amount <= 0) return null;

    const revenueAccountId = await this.resolveRevenue(client, tenantId);
    const bankAccountId = await this.resolveControl(client, tenantId, 'BANK');

    return this.createAndPost(client, {
      tenantId, actorId,
      branchId: refund.branchId,
      journalType: 'REFUND',
      entryDate: new Date(),
      currencyCode: refund.currencyCode,
      exchangeRate: 1,
      functionalCurrencyCode: refund.currencyCode,
      sourceType: 'RefundRequest',
      sourceId: refund.id,
      sourceNumber: refund.refundNumber,
      description: `Refund ${refund.refundNumber} processed`,
      lines: [
        { accountId: revenueAccountId, debit: refund.amount, credit: 0, partyType: refund.clientId ? 'CUSTOMER' : undefined, partyId: refund.clientId ?? undefined },
        { accountId: bankAccountId, debit: 0, credit: refund.amount },
      ],
    });
  }
}
