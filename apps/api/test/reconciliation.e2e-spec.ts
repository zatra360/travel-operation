import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { GLPostingService } from '../src/modules/accounting/gl-posting.service';
import { FinancialReportsService } from '../src/modules/accounting/financial-reports.service';
import { ReconciliationService } from '../src/modules/accounting/reconciliation.service';
import { FiscalPeriodService } from '../src/modules/accounting/fiscal-period.service';
import { AccountingAuditService } from '../src/modules/accounting/accounting-audit.service';

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
const reconciliation = new ReconciliationService(prisma as any);
const periods = new FiscalPeriodService(prisma as any, new AccountingAuditService(prisma as any), reconciliation);

const RUN = `t${Date.now()}`;
const USER = `user-${RUN}`;
const FY_CODE = `FY${RUN}`;

let TENANT: string;
let currentPeriodId: string;
let previousPeriodId: string;
let invoiceId: string;

function monthRange(offsetMonths: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offsetMonths + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

beforeAll(async () => {
  await prisma.$queryRaw`SELECT 1`;

  const tenant = await prisma.tenant.create({
    data: { name: `Recon Test ${RUN}`, slug: `recon-${RUN}` },
  });
  TENANT = tenant.id;

  const defs: Array<[string, string, string, string?, boolean?]> = [
    ['1000', 'Cash in Hand', 'ASSET', 'CASH', false],
    ['1010', 'Bank Accounts', 'ASSET', 'BANK', false],
    ['1100', 'Accounts Receivable', 'ASSET', 'ACCOUNTS_RECEIVABLE', false],
    ['2100', 'Tax Payable', 'LIABILITY', 'TAX_PAYABLE', false],
    ['4000', 'Service Revenue', 'REVENUE', undefined, true],
    ['7000', 'Other Expense', 'OTHER_EXPENSE', undefined, true],
  ];
  for (const [code, name, type, control, manual] of defs) {
    const balance = ['ASSET', 'EXPENSE', 'OTHER_EXPENSE'].includes(type) ? 'DEBIT' : 'CREDIT';
    await prisma.gLAccount.create({
      data: {
        tenantId: TENANT, accountCode: code, accountName: name,
        accountType: type as any, normalBalance: balance as any,
        controlAccountType: control, allowManualPosting: manual ?? true,
      },
    });
  }

  const current = monthRange(0);
  const previous = monthRange(-1);
  const fy = await prisma.fiscalYear.create({
    data: { tenantId: TENANT, code: FY_CODE, startDate: previous.start, endDate: current.end },
  });
  const p0 = await prisma.accountingPeriod.create({
    data: {
      tenantId: TENANT, fiscalYearId: fy.id, periodNumber: 1, code: `${FY_CODE}-P1`,
      startDate: previous.start, endDate: previous.end, status: 'OPEN',
    },
  });
  const p1 = await prisma.accountingPeriod.create({
    data: {
      tenantId: TENANT, fiscalYearId: fy.id, periodNumber: 2, code: `${FY_CODE}-P2`,
      startDate: current.start, endDate: current.end, status: 'OPEN',
    },
  });
  previousPeriodId = p0.id;
  currentPeriodId = p1.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('AR reconciliation lifecycle', () => {
  it('detects an issued invoice without a journal and reports not reconciled', async () => {
    const invoice = await prisma.invoice.create({
      data: {
        tenantId: TENANT, invoiceNumber: `INV-${RUN}-1`, status: 'SENT',
        subtotal: 100, taxAmount: 10, totalAmount: 110, paidAmount: 0, dueAmount: 110,
        currencyCode: 'USD', issuedAt: new Date(),
      },
    });
    invoiceId = invoice.id;

    const result = await reconciliation.reconcileAR(TENANT);
    expect(result.glActivated).toBe(true);
    expect(result.subLedgerBalance).toBe(110);
    expect(result.glBalance).toBe(0);
    expect(result.difference).toBe(-110);
    expect(result.isReconciled).toBe(false);
    expect(result.unpostedDocuments.map((d) => d.id)).toContain(invoiceId);
  });

  it('blocks a clean period close while unposted documents exist', async () => {
    const checklist = await periods.closeChecklist(TENANT, currentPeriodId);
    expect(checklist.canClose).toBe(false);
    expect(checklist.blockers.some((b) => b.type === 'UNPOSTED_INVOICES')).toBe(true);

    await expect(
      periods.closePeriod(TENANT, USER, currentPeriodId, { action: 'CLOSE' } as any),
    ).rejects.toThrow(/PERIOD_CLOSE_BLOCKED/);

    await expect(
      periods.closePeriod(TENANT, USER, currentPeriodId, { action: 'CLOSE', force: true } as any),
    ).rejects.toThrow(/requires a reason/);
  });

  it('reconciles once the invoice journal is posted', async () => {
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    await glPosting.postCustomerInvoiceIssued(null, TENANT, USER, invoice!);

    const result = await reconciliation.reconcileAR(TENANT);
    expect(result.subLedgerBalance).toBe(110);
    expect(result.glBalance).toBe(110);
    expect(result.difference).toBe(0);
    expect(result.unpostedDocuments).toHaveLength(0);
    expect(result.isReconciled).toBe(true);
  });

  it('stays reconciled after a settling payment is posted and the invoice is paid down', async () => {
    const payment = await prisma.payment.create({
      data: {
        tenantId: TENANT, invoiceId, amount: 110, currencyCode: 'USD',
        paymentMethod: 'BANK_TRANSFER', status: 'RECEIVED', receivedAt: new Date(),
      },
    });
    await glPosting.postPaymentReceived(null, TENANT, USER, payment);
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { paidAmount: 110, dueAmount: 0, status: 'PAID' },
    });

    const result = await reconciliation.reconcileAR(TENANT);
    expect(result.subLedgerBalance).toBe(0);
    expect(result.glBalance).toBe(0);
    expect(result.isReconciled).toBe(true);
  });
});

describe('Period close', () => {
  it('blocks close while a draft journal is dated in the period, then closes cleanly', async () => {
    const draft = await prisma.journalEntry.create({
      data: { tenantId: TENANT, entryDate: new Date(), createdById: USER, description: 'stray draft' },
    });

    const blocked = await periods.closeChecklist(TENANT, currentPeriodId);
    expect(blocked.canClose).toBe(false);
    expect(blocked.blockers.some((b) => b.type === 'UNPOSTED_JOURNALS')).toBe(true);

    await prisma.journalEntry.delete({ where: { id: draft.id } });

    const clean = await periods.closeChecklist(TENANT, currentPeriodId);
    expect(clean.canClose).toBe(true);

    const closed = await periods.closePeriod(TENANT, USER, currentPeriodId, { action: 'CLOSE', reason: 'Month-end close' } as any);
    expect(closed.status).toBe('CLOSED');

    const log = await prisma.periodCloseLog.findFirst({ where: { tenantId: TENANT, periodId: currentPeriodId, action: 'CLOSE' } });
    expect(log).toBeTruthy();
  });

  it('force-closes a period with blockers and records them in the audit ledger', async () => {
    const lastMonth = monthRange(-1);
    await prisma.invoice.create({
      data: {
        tenantId: TENANT, invoiceNumber: `INV-${RUN}-OLD`, status: 'SENT',
        subtotal: 40, taxAmount: 0, totalAmount: 40, paidAmount: 0, dueAmount: 40,
        currencyCode: 'USD', issuedAt: new Date(lastMonth.start.getTime() + 24 * 3600 * 1000),
      },
    });

    await expect(
      periods.closePeriod(TENANT, USER, previousPeriodId, { action: 'CLOSE' } as any),
    ).rejects.toThrow(/PERIOD_CLOSE_BLOCKED/);

    const forced = await periods.closePeriod(TENANT, USER, previousPeriodId, {
      action: 'CLOSE', force: true, reason: 'Legacy pre-GL invoices accepted',
    } as any);
    expect(forced.status).toBe('CLOSED');

    const audit = await prisma.systemAuditLog.findFirst({
      where: { tenantId: TENANT, action: 'PERIOD_CLOSE', recordId: previousPeriodId },
      orderBy: { eventSequence: 'desc' },
    });
    expect(audit).toBeTruthy();
    expect(JSON.stringify(audit!.afterState)).toContain('forcedWithBlockers');
  });
});

describe('Cash flow statement', () => {
  it('reports customer receipts as inflows with correct closing cash', async () => {
    const flow = await reports.cashFlow(TENANT);
    expect(flow.glActivated).toBe(true);
    expect(flow.openingCash).toBe(0);
    expect(flow.totalInflows).toBe(110);
    expect(flow.inflows.find((i) => i.category === 'RECEIPT')?.amount).toBe(110);
    expect(flow.totalOutflows).toBe(0);
    expect(flow.closingCash).toBe(110);
  });
});

describe('Orphan journal detection', () => {
  it('lists posted journals whose source document was hard-deleted', async () => {
    const ghost = await prisma.invoice.create({
      data: {
        tenantId: TENANT, invoiceNumber: `INV-${RUN}-GHOST`, status: 'SENT',
        subtotal: 20, taxAmount: 0, totalAmount: 20, paidAmount: 0, dueAmount: 20,
        currencyCode: 'USD', issuedAt: new Date(monthRange(0).start.getTime() + 3600 * 1000),
      },
    });
    // Reopen the current period so the ghost journal can post into it.
    await periods.reopenPeriod(TENANT, USER, currentPeriodId, { reason: 'Testing orphan detection' } as any);
    await glPosting.postCustomerInvoiceIssued(null, TENANT, USER, ghost);
    await prisma.invoice.delete({ where: { id: ghost.id } });

    const orphans = await reconciliation.findOrphanJournals(TENANT);
    expect(orphans.some((o) => o.sourceType === 'Invoice' && o.sourceId === ghost.id)).toBe(true);

    const result = await reconciliation.reconcileAR(TENANT);
    expect(result.isReconciled).toBe(false);
  });
});
