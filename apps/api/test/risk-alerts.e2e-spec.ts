import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { RiskAlertService } from '../src/modules/accounting/risk-alert.service';
import { ReconciliationService } from '../src/modules/accounting/reconciliation.service';
import { AccountingAuditService } from '../src/modules/accounting/accounting-audit.service';
import { GLPostingService } from '../src/modules/accounting/gl-posting.service';

const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*"?([^"#]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

jest.setTimeout(60000);

const prisma = new PrismaClient();
const reconciliation = new ReconciliationService(prisma as any);
const riskAlerts = new RiskAlertService(prisma as any, new AccountingAuditService(prisma as any), reconciliation);
const glPosting = new GLPostingService(prisma as any);

const RUN = `t${Date.now()}`;
const USER = `user-${RUN}`;
const FY_CODE = `FY${RUN}`;

let TENANT: string;
let revenueAccountId: string;
let cashAccountId: string;

function monthRange(offsetMonths: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offsetMonths + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

beforeAll(async () => {
  await prisma.$queryRaw`SELECT 1`;

  const tenant = await prisma.tenant.create({
    data: { name: `Risk Test ${RUN}`, slug: `risk-${RUN}` },
  });
  TENANT = tenant.id;

  const cash = await prisma.gLAccount.create({
    data: {
      tenantId: TENANT, accountCode: '1000', accountName: 'Cash', accountType: 'ASSET',
      normalBalance: 'DEBIT', controlAccountType: 'CASH', allowManualPosting: true,
    },
  });
  await prisma.gLAccount.create({
    data: {
      tenantId: TENANT, accountCode: '1010', accountName: 'Bank', accountType: 'ASSET',
      normalBalance: 'DEBIT', controlAccountType: 'BANK', allowManualPosting: false,
    },
  });
  await prisma.gLAccount.create({
    data: {
      tenantId: TENANT, accountCode: '1100', accountName: 'Accounts Receivable', accountType: 'ASSET',
      normalBalance: 'DEBIT', controlAccountType: 'ACCOUNTS_RECEIVABLE', allowManualPosting: false,
    },
  });
  const revenue = await prisma.gLAccount.create({
    data: {
      tenantId: TENANT, accountCode: '4000', accountName: 'Revenue', accountType: 'REVENUE',
      normalBalance: 'CREDIT', allowManualPosting: true,
    },
  });
  cashAccountId = cash.id;
  revenueAccountId = revenue.id;

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

describe('Risk alert detectors', () => {
  beforeAll(async () => {
    const client = await prisma.client.create({
      data: { tenantId: TENANT, displayName: `Risk Client ${RUN}` },
    });
    await prisma.invoice.createMany({
      data: [
        { tenantId: TENANT, invoiceNumber: `DUP-${RUN}-A`, clientId: client.id, status: 'DRAFT', totalAmount: 999, dueAmount: 999 },
        { tenantId: TENANT, invoiceNumber: `DUP-${RUN}-B`, clientId: client.id, status: 'DRAFT', totalAmount: 999, dueAmount: 999 },
      ],
    });

    const day = new Date();
    await prisma.expense.createMany({
      data: [
        { tenantId: TENANT, expenseNumber: `EXP-${RUN}-1`, vendorName: 'Acme Supplies', amount: 500, status: 'PENDING', expenseDate: day },
        { tenantId: TENANT, expenseNumber: `EXP-${RUN}-2`, vendorName: 'Acme Supplies', amount: 500, status: 'PENDING', expenseDate: day },
      ],
    });

    const manual = await prisma.journalEntry.create({
      data: {
        tenantId: TENANT, journalType: 'MANUAL', entryDate: new Date(),
        createdById: USER, approvedById: `approver-${RUN}`, description: 'Round manual entry',
      },
    });
    await prisma.journalItem.createMany({
      data: [
        {
          journalEntryId: manual.id, tenantId: TENANT, lineNumber: 1, accountId: cashAccountId,
          debit: 5000, credit: 0, functionalDebit: 5000, functionalCredit: 0, transactionAmount: 5000,
        },
        {
          journalEntryId: manual.id, tenantId: TENANT, lineNumber: 2, accountId: revenueAccountId,
          debit: 0, credit: 5000, functionalDebit: 0, functionalCredit: 5000, transactionAmount: 5000,
        },
      ],
    });
    await prisma.$queryRaw`SELECT fn_post_journal_entry(${manual.id}, ${TENANT}, ${USER}, false)`;

    await prisma.payment.create({
      data: {
        tenantId: TENANT, amount: 750, currencyCode: 'USD', paymentMethod: 'BANK_TRANSFER',
        status: 'RECEIVED', receivedAt: new Date(), reference: `PAY-${RUN}`,
      },
    });
  });

  it('detects duplicates, round manual journals, rapid postings and unposted payments', async () => {
    const result = await riskAlerts.scan(TENANT, USER);
    expect(result.newAlerts).toBeGreaterThanOrEqual(4);

    const alerts = await riskAlerts.findAll(TENANT, {});
    const types = new Set(alerts.data.map((a) => a.alertType));
    expect(types).toContain('SIMILAR_INVOICES');
    expect(types).toContain('DUPLICATE_EXPENSE');
    expect(types).toContain('ROUND_NUMBER_MANUAL_JOURNAL');
    expect(types).toContain('RAPID_CREATE_POST');
    expect(types).toContain('PAYMENT_WITHOUT_JOURNAL');
  });

  it('is idempotent: a second scan creates no duplicate alerts', async () => {
    const again = await riskAlerts.scan(TENANT, USER);
    expect(again.newAlerts).toBe(0);
  });

  it('drops the unposted-payment alert candidate once the payment is posted', async () => {
    const payment = await prisma.payment.findFirst({ where: { tenantId: TENANT, reference: `PAY-${RUN}` } });
    await glPosting.postPaymentReceived(null, TENANT, USER, payment!);

    const unposted = await reconciliation.findUnpostedDocuments(TENANT);
    expect(unposted.filter((d) => d.documentType === 'Payment')).toHaveLength(0);
  });
});

describe('Risk alert review workflow', () => {
  let alertId: string;

  beforeAll(async () => {
    const alerts = await riskAlerts.findAll(TENANT, { alertType: 'SIMILAR_INVOICES' });
    alertId = alerts.data[0].id;
  });

  it('requires a note to resolve or dismiss', async () => {
    await expect(
      riskAlerts.review(TENANT, USER, alertId, { status: 'DISMISSED' }),
    ).rejects.toThrow(/requires a note/);
  });

  it('moves an alert through review and records an audit event', async () => {
    const inReview = await riskAlerts.review(TENANT, USER, alertId, { status: 'IN_REVIEW' });
    expect(inReview.status).toBe('IN_REVIEW');

    const resolved = await riskAlerts.review(TENANT, USER, alertId, {
      status: 'RESOLVED', note: 'Second invoice was voided; numbering corrected.',
    });
    expect(resolved.status).toBe('RESOLVED');
    expect(resolved.reviewedById).toBe(USER);

    await expect(
      riskAlerts.review(TENANT, USER, alertId, { status: 'DISMISSED', note: 'again' }),
    ).rejects.toThrow(/already RESOLVED/);

    const audit = await prisma.systemAuditLog.findFirst({
      where: { tenantId: TENANT, action: 'RISK_ALERT_REVIEWED', recordId: alertId },
    });
    expect(audit).toBeTruthy();
  });

  it('rejects invalid review statuses', async () => {
    const alerts = await riskAlerts.findAll(TENANT, { status: 'OPEN' });
    await expect(
      riskAlerts.review(TENANT, USER, alerts.data[0].id, { status: 'OPEN' }),
    ).rejects.toThrow(/must be one of/);
  });
});

describe('Bank reconciliation', () => {
  it('compares operational bank balances against the GL BANK control account', async () => {
    await prisma.bankAccount.create({
      data: {
        tenantId: TENANT, bankName: 'Test Bank', accountName: 'Main', accountNumber: `ACC-${RUN}`,
        currencyCode: 'USD', openingBalance: 0, currentBalance: 750,
      },
    });

    const result = await reconciliation.reconcileBank(TENANT);
    expect(result.glActivated).toBe(true);
    expect(result.operationalBalance).toBe(750);
    expect(result.glBalance).toBe(750);
    expect(result.difference).toBe(0);
    expect(result.isReconciled).toBe(true);
  });

  it('reports a difference when operational balances drift from the ledger', async () => {
    await prisma.bankAccount.create({
      data: {
        tenantId: TENANT, bankName: 'Ghost Bank', accountName: 'Untracked', accountNumber: `ACC2-${RUN}`,
        currencyCode: 'USD', openingBalance: 0, currentBalance: 100,
      },
    });

    const result = await reconciliation.reconcileBank(TENANT);
    expect(result.operationalBalance).toBe(850);
    expect(result.glBalance).toBe(750);
    expect(result.difference).toBe(-100);
    expect(result.isReconciled).toBe(false);
  });
});
