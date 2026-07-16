import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { GLPostingService } from '../src/modules/accounting/gl-posting.service';
import { ReconciliationService } from '../src/modules/accounting/reconciliation.service';

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
const reconciliation = new ReconciliationService(prisma as any);

const RUN = `t${Date.now()}`;
const TENANT_ID = `ap-e2e-${RUN}`;
const USER = `user-${RUN}`;
const FY_CODE = `FY${RUN}`;
let TENANT: string;

function monthRange(offsetMonths: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offsetMonths + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

beforeAll(async () => {
  await prisma.$queryRaw`SELECT 1`;

  const tenant = await prisma.tenant.create({
    data: { name: `AP Test ${RUN}`, slug: TENANT_ID },
  });
  TENANT = tenant.id;

  for (const [code, name, type, control, manual] of [
    ['1000', 'Cash in Hand', 'ASSET', 'CASH', false],
    ['1010', 'Bank', 'ASSET', 'BANK', false],
    ['2000', 'Accounts Payable', 'LIABILITY', 'ACCOUNTS_PAYABLE', false],
    ['6100', 'Office Rent', 'EXPENSE', undefined, true],
    ['7000', 'Other Expense', 'OTHER_EXPENSE', undefined, true],
  ] as const) {
    const balance = type === 'LIABILITY' ? 'CREDIT' : 'DEBIT';
    await prisma.gLAccount.create({
      data: { tenantId: TENANT, accountCode: code, accountName: name, accountType: type as any, normalBalance: balance as any, controlAccountType: control, allowManualPosting: manual ?? true },
    });
  }

  const current = monthRange(0);
  const fy = await prisma.fiscalYear.create({
    data: { tenantId: TENANT, code: FY_CODE, startDate: current.start, endDate: current.end },
  });
  await prisma.accountingPeriod.create({
    data: { tenantId: TENANT, fiscalYearId: fy.id, periodNumber: 1, code: `${FY_CODE}-P1`, startDate: current.start, endDate: current.end, status: 'OPEN' },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Accounts payable accrual + settlement', () => {
  let expenseId: string;

  it('posts Dr Expense / Cr AP on approval (accrual)', async () => {
    const expense = await prisma.expense.create({
      data: { tenantId: TENANT, expenseNumber: `EXP-${RUN}-1`, category: 'Office Rent', amount: 500, status: 'APPROVED', currencyCode: 'USD' },
    });
    expenseId = expense.id;

    const result = await glPosting.postExpenseAccrual(null, TENANT, USER, expense);
    expect(result).toBeTruthy();

    const journal = await prisma.journalEntryLink.findFirst({
      where: { tenantId: TENANT, sourceType: 'Expense', sourceId: expense.id, purpose: 'PRIMARY' },
      include: { journalEntry: { include: { items: { orderBy: { lineNumber: 'asc' }, include: { account: true } } } } },
    });
    const je = journal!.journalEntry;
    const byAccount = Object.fromEntries(je.items.map((i) => [i.account.accountCode, { debit: Number(i.functionalDebit), credit: Number(i.functionalCredit) }]));
    expect(byAccount['6100'].debit).toBe(500);
    expect(byAccount['2000'].credit).toBe(500);
    expect(byAccount['1000']).toBeUndefined();
  });

  it('settles AP on payment with Dr AP / Cr Bank and a SETTLEMENT link', async () => {
    const expense = await prisma.expense.update({
      where: { id: expenseId },
      data: { status: 'PAID' },
    });

    const result = await glPosting.postExpenseSettlement(null, TENANT, USER, {
      ...expense, amount: 500, paymentMethod: 'BANK_TRANSFER',
    });
    expect(result).toBeTruthy();

    const settlementLink = await prisma.journalEntryLink.findFirst({
      where: { tenantId: TENANT, sourceType: 'Expense', sourceId: expenseId, purpose: 'SETTLEMENT' },
      include: { journalEntry: { include: { items: { orderBy: { lineNumber: 'asc' }, include: { account: true } } } } },
    });
    const je = settlementLink!.journalEntry;
    const byAccount = Object.fromEntries(je.items.map((i) => [i.account.accountCode, { debit: Number(i.functionalDebit), credit: Number(i.functionalCredit) }]));
    expect(byAccount['2000'].debit).toBe(500);
    expect(byAccount['1010'].credit).toBe(500);
  });

  it('settlement is idempotent (duplicate call returns existing journal)', async () => {
    const before = await prisma.journalEntryLink.count({
      where: { tenantId: TENANT, sourceType: 'Expense', sourceId: expenseId },
    });
    const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
    await glPosting.postExpenseSettlement(null, TENANT, USER, { ...expense!, amount: 500, paymentMethod: 'BANK_TRANSFER' });
    const after = await prisma.journalEntryLink.count({
      where: { tenantId: TENANT, sourceType: 'Expense', sourceId: expenseId },
    });
    expect(after).toBe(before);
  });

  it('accrual is also idempotent', async () => {
    const before = await prisma.journalEntryLink.count({
      where: { tenantId: TENANT, sourceType: 'Expense', sourceId: expenseId, purpose: 'PRIMARY' },
    });
    const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
    await glPosting.postExpenseAccrual(null, TENANT, USER, expense!);
    const after = await prisma.journalEntryLink.count({
      where: { tenantId: TENANT, sourceType: 'Expense', sourceId: expenseId, purpose: 'PRIMARY' },
    });
    expect(after).toBe(before);
  });
});

describe('AP reconciliation', () => {
  it('reports AP reconciled (accrued obligation = GL control account, settled books net to zero)', async () => {
    const result = await reconciliation.reconcileAP(TENANT);
    expect(result.glActivated).toBe(true);
    expect(result.subLedgerBalance).toBe(0);
    expect(result.settledTotal).toBe(500);
    expect(result.settledCount).toBeGreaterThanOrEqual(1);
    expect(result.difference).toBe(0);
    expect(result.isReconciled).toBe(true);
  });

  it('flags unaccrued approved expenses', async () => {
    const unaccrued = await prisma.expense.create({
      data: { tenantId: TENANT, expenseNumber: `EXP-${RUN}-2`, category: 'Office Rent', amount: 300, status: 'APPROVED', currencyCode: 'USD' },
    });
    const result = await reconciliation.reconcileAP(TENANT);
    expect(result.missingAccrualExpenseIds).toContain(unaccrued.id);
    expect(result.isReconciled).toBe(false);

    await glPosting.postExpenseAccrual(null, TENANT, USER, unaccrued);
    const fixed = await reconciliation.reconcileAP(TENANT);
    expect(fixed.isReconciled).toBe(true);
  });
});
