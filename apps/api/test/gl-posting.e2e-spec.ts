import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { GLPostingService } from '../src/modules/accounting/gl-posting.service';
import { FinancialReportsService } from '../src/modules/accounting/financial-reports.service';

const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*"?([^"#]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

jest.setTimeout(60000);

const prisma = new PrismaClient();
const glPosting = new GLPostingService(prisma as any);
const reports = new FinancialReportsService(prisma as any);

const RUN = `t${Date.now()}`;
const TENANT = `glpost-e2e-${RUN}`;
const EMPTY_TENANT = `glpost-empty-${RUN}`;
const USER = `user-${RUN}`;
const FY_CODE = `FY${RUN}`;

const accounts: Record<string, string> = {};

function monthRange(offsetMonths: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offsetMonths + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

async function journalFor(sourceType: string, sourceId: string) {
  const link = await prisma.journalEntryLink.findUnique({
    where: { tenantId_sourceType_sourceId_purpose: { tenantId: TENANT, sourceType, sourceId, purpose: 'PRIMARY' } },
  });
  if (!link) return null;
  return prisma.journalEntry.findUnique({
    where: { id: link.journalEntryId },
    include: { items: { orderBy: { lineNumber: 'asc' }, include: { account: true } } },
  });
}

beforeAll(async () => {
  await prisma.$queryRaw`SELECT 1`;

  const defs: Array<[string, string, string, string, string?, boolean?]> = [
    ['cash', '1000', 'Cash in Hand', 'ASSET', 'CASH', false],
    ['bank', '1010', 'Bank Accounts', 'ASSET', 'BANK', false],
    ['ar', '1100', 'Accounts Receivable', 'ASSET', 'ACCOUNTS_RECEIVABLE', false],
    ['taxPayable', '2100', 'Tax Payable', 'LIABILITY', 'TAX_PAYABLE', false],
    ['revenue', '4000', 'Service Revenue', 'REVENUE', undefined, true],
    ['rentExpense', '6100', 'Office Rent', 'EXPENSE', undefined, true],
    ['otherExpense', '7000', 'Other Expense', 'OTHER_EXPENSE', undefined, true],
  ];
  for (const [key, code, name, type, control, manual] of defs) {
    const balance = ['ASSET', 'EXPENSE', 'OTHER_EXPENSE'].includes(type) ? 'DEBIT' : 'CREDIT';
    const account = await prisma.gLAccount.create({
      data: {
        tenantId: TENANT, accountCode: code, accountName: name,
        accountType: type as any, normalBalance: balance as any,
        controlAccountType: control, allowManualPosting: manual ?? true,
      },
    });
    accounts[key] = account.id;
  }

  const current = monthRange(0);
  const fy = await prisma.fiscalYear.create({
    data: { tenantId: TENANT, code: FY_CODE, startDate: current.start, endDate: current.end },
  });
  await prisma.accountingPeriod.create({
    data: {
      tenantId: TENANT, fiscalYearId: fy.id, periodNumber: 1, code: `${FY_CODE}-P1`,
      startDate: current.start, endDate: current.end, status: 'OPEN',
    },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('GL posting bridge', () => {
  const invoiceId = `inv-${RUN}`;

  it('posts Dr AR / Cr Revenue / Cr Tax when an invoice is issued', async () => {
    const result = await glPosting.postCustomerInvoiceIssued(null, TENANT, USER, {
      id: invoiceId, invoiceNumber: `INV-${RUN}`, clientId: 'client-1',
      totalAmount: 110, taxAmount: 10, currencyCode: 'USD', exchangeRate: 1,
      baseCurrencyCode: 'USD', issuedAt: new Date(),
    });
    expect(result).toBeTruthy();
    expect(result!.journalNumber).toMatch(new RegExp(`^JE-${FY_CODE}-\\d{6}$`));

    const journal = await journalFor('Invoice', invoiceId);
    expect(journal!.status).toBe('POSTED');
    expect(journal!.journalType).toBe('SALES');

    const byAccount = Object.fromEntries(journal!.items.map((i) => [i.accountId, i]));
    expect(Number(byAccount[accounts.ar].debit)).toBe(110);
    expect(Number(byAccount[accounts.revenue].credit)).toBe(100);
    expect(Number(byAccount[accounts.taxPayable].credit)).toBe(10);
  });

  it('is idempotent: re-posting the same invoice returns the existing journal', async () => {
    const before = await prisma.journalEntry.count({ where: { tenantId: TENANT } });
    const again = await glPosting.postCustomerInvoiceIssued(null, TENANT, USER, {
      id: invoiceId, invoiceNumber: `INV-${RUN}`, clientId: 'client-1',
      totalAmount: 110, taxAmount: 10, currencyCode: 'USD', exchangeRate: 1,
      baseCurrencyCode: 'USD', issuedAt: new Date(),
    });
    const after = await prisma.journalEntry.count({ where: { tenantId: TENANT } });
    expect(again).toBeTruthy();
    expect(after).toBe(before);
  });

  it('posts Dr Cash / Cr AR for a CASH payment received', async () => {
    const paymentId = `pay-cash-${RUN}`;
    await glPosting.postPaymentReceived(null, TENANT, USER, {
      id: paymentId, clientId: 'client-1', amount: 60, currencyCode: 'USD',
      exchangeRate: 1, baseCurrencyCode: 'USD', paymentMethod: 'CASH', receivedAt: new Date(),
    });
    const journal = await journalFor('Payment', paymentId);
    const byAccount = Object.fromEntries(journal!.items.map((i) => [i.accountId, i]));
    expect(Number(byAccount[accounts.cash].debit)).toBe(60);
    expect(Number(byAccount[accounts.ar].credit)).toBe(60);
  });

  it('posts Dr Bank / Cr AR for a BANK_TRANSFER payment received', async () => {
    const paymentId = `pay-bank-${RUN}`;
    await glPosting.postPaymentReceived(null, TENANT, USER, {
      id: paymentId, clientId: 'client-1', amount: 50, currencyCode: 'USD',
      exchangeRate: 1, baseCurrencyCode: 'USD', paymentMethod: 'BANK_TRANSFER', receivedAt: new Date(),
    });
    const journal = await journalFor('Payment', paymentId);
    const byAccount = Object.fromEntries(journal!.items.map((i) => [i.accountId, i]));
    expect(Number(byAccount[accounts.bank].debit)).toBe(50);
    expect(Number(byAccount[accounts.ar].credit)).toBe(50);
  });

  it('posts Dr Expense (category-matched) / Cr Cash for a paid expense', async () => {
    const expenseId = `exp-${RUN}`;
    await glPosting.postExpensePaid(null, TENANT, USER, {
      id: expenseId, expenseNumber: `EXP-${RUN}`, category: 'Office Rent',
      amount: 25, currencyCode: 'USD',
    });
    const journal = await journalFor('Expense', expenseId);
    expect(journal!.journalType).toBe('EXPENSE');
    const byAccount = Object.fromEntries(journal!.items.map((i) => [i.accountId, i]));
    expect(Number(byAccount[accounts.rentExpense].debit)).toBe(25);
    expect(Number(byAccount[accounts.cash].credit)).toBe(25);
  });

  it('falls back to a generic expense account when the category has no match', async () => {
    const expenseId = `exp-fallback-${RUN}`;
    await glPosting.postExpensePaid(null, TENANT, USER, {
      id: expenseId, expenseNumber: `EXPF-${RUN}`, category: 'Unmapped Category',
      amount: 5, currencyCode: 'USD',
    });
    const journal = await journalFor('Expense', expenseId);
    const byAccount = Object.fromEntries(journal!.items.map((i) => [i.accountId, i]));
    expect(Number(byAccount[accounts.otherExpense].debit)).toBe(5);
  });

  it('posts Dr Revenue / Cr Bank for a processed refund', async () => {
    const refundId = `ref-${RUN}`;
    await glPosting.postRefundProcessed(null, TENANT, USER, {
      id: refundId, refundNumber: `REF-${RUN}`, clientId: 'client-1',
      amount: 15, currencyCode: 'USD',
    });
    const journal = await journalFor('RefundRequest', refundId);
    expect(journal!.journalType).toBe('REFUND');
    const byAccount = Object.fromEntries(journal!.items.map((i) => [i.accountId, i]));
    expect(Number(byAccount[accounts.revenue].debit)).toBe(15);
    expect(Number(byAccount[accounts.bank].credit)).toBe(15);
  });

  it('skips posting entirely for tenants without a chart of accounts', async () => {
    const result = await glPosting.postCustomerInvoiceIssued(null, EMPTY_TENANT, USER, {
      id: `inv-empty-${RUN}`, invoiceNumber: 'X', totalAmount: 100, taxAmount: 0,
      currencyCode: 'USD', exchangeRate: 1,
    });
    expect(result).toBeNull();
    expect(await prisma.journalEntry.count({ where: { tenantId: EMPTY_TENANT } })).toBe(0);
  });

  it('fails closed when GL is active but a control mapping is missing', async () => {
    await prisma.gLAccount.update({
      where: { id: accounts.taxPayable },
      data: { isActive: false },
    });
    await expect(
      glPosting.postCustomerInvoiceIssued(null, TENANT, USER, {
        id: `inv-notax-${RUN}`, invoiceNumber: `INVNT-${RUN}`, totalAmount: 55, taxAmount: 5,
        currencyCode: 'USD', exchangeRate: 1,
      }),
    ).rejects.toThrow(/ACCOUNT_MAPPING_MISSING/);
    await prisma.gLAccount.update({
      where: { id: accounts.taxPayable },
      data: { isActive: true },
    });
  });
});

describe('Financial reports', () => {
  it('produces a balanced trial-balance-equivalent income statement and balance sheet', async () => {
    // Books so far: Invoice 110 (Rev 100, Tax 10), receipts 60 cash + 50 bank,
    // expenses 25 + 5, refund 15 (contra revenue, bank out).
    const pnl = await reports.incomeStatement(TENANT);
    expect(pnl.revenue.total).toBe(85); // 100 - 15 refund
    expect(pnl.expenses.total).toBe(25);
    expect(pnl.otherExpense.total).toBe(5);
    expect(pnl.netProfit).toBe(55);

    const bs = await reports.balanceSheet(TENANT);
    // Assets: cash 60 - 25 - 5 = 30; bank 50 - 15 = 35; AR 110 - 60 - 50 = 0
    expect(bs.assets.total).toBe(65);
    // Liabilities: tax payable 10; Equity: current earnings 55
    expect(bs.liabilities.total).toBe(10);
    expect(bs.equity.currentPeriodEarnings).toBe(55);
    expect(bs.totalLiabilitiesAndEquity).toBe(65);
    expect(bs.isBalanced).toBe(true);
  });

  it('produces an account ledger with running balance', async () => {
    const ledger = await reports.generalLedger(TENANT, accounts.cash);
    expect(ledger.openingBalance).toBe(0);
    expect(ledger.lines.length).toBeGreaterThanOrEqual(3);
    expect(ledger.closingBalance).toBe(30);
  });
});
