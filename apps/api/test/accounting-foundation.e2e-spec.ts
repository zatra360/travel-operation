import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*"?([^"#]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

jest.setTimeout(60000);

const prisma = new PrismaClient();

const RUN = `t${Date.now()}`;
const TENANT = `acct-e2e-${RUN}`;
const USER_A = `user-a-${RUN}`;
const USER_B = `user-b-${RUN}`;
const FY_CODE = `FY${RUN}`;

let cashAccountId: string;
let revenueAccountId: string;
let controlAccountId: string;

function monthRange(offsetMonths: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offsetMonths + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

async function createDraftEntry(opts: {
  journalType?: string;
  entryDate?: Date;
  sourceType?: string;
  sourceId?: string;
  createdById?: string;
  approvedById?: string;
  lines: Array<{ accountId: string; debit: number; credit: number }>;
}) {
  const entry = await prisma.journalEntry.create({
    data: {
      tenantId: TENANT,
      journalType: opts.journalType ?? 'GENERAL',
      entryDate: opts.entryDate ?? new Date(),
      currencyCode: 'USD',
      functionalCurrencyCode: 'USD',
      sourceType: opts.sourceType,
      sourceId: opts.sourceId,
      createdById: opts.createdById ?? USER_A,
      approvedById: opts.approvedById,
      description: 'integration test entry',
    },
  });
  let line = 1;
  for (const l of opts.lines) {
    await prisma.journalItem.create({
      data: {
        journalEntryId: entry.id,
        tenantId: TENANT,
        lineNumber: line++,
        accountId: l.accountId,
        debit: l.debit,
        credit: l.credit,
        transactionCurrency: 'USD',
        transactionAmount: l.debit > 0 ? l.debit : l.credit,
        functionalDebit: l.debit,
        functionalCredit: l.credit,
      },
    });
  }
  return entry;
}

async function post(journalId: string, posterId = USER_A, allowSelfPost = false): Promise<string> {
  const rows = await prisma.$queryRaw<Array<{ fn_post_journal_entry: string }>>`
    SELECT fn_post_journal_entry(${journalId}, ${TENANT}, ${posterId}, ${allowSelfPost})`;
  return rows[0].fn_post_journal_entry;
}

async function reverse(journalId: string, reverserId: string, reason: string): Promise<string> {
  const rows = await prisma.$queryRaw<Array<{ fn_reverse_journal_entry: string }>>`
    SELECT fn_reverse_journal_entry(${journalId}, ${TENANT}, ${reverserId}, ${reason})`;
  return rows[0].fn_reverse_journal_entry;
}

beforeAll(async () => {
  await prisma.$queryRaw`SELECT 1`;

  const cash = await prisma.gLAccount.create({
    data: {
      tenantId: TENANT, accountCode: '1000', accountName: 'Cash',
      accountType: 'ASSET', normalBalance: 'DEBIT', allowManualPosting: true,
    },
  });
  const revenue = await prisma.gLAccount.create({
    data: {
      tenantId: TENANT, accountCode: '4000', accountName: 'Revenue',
      accountType: 'REVENUE', normalBalance: 'CREDIT', allowManualPosting: true,
    },
  });
  const control = await prisma.gLAccount.create({
    data: {
      tenantId: TENANT, accountCode: '1100', accountName: 'Accounts Receivable',
      accountType: 'ASSET', normalBalance: 'DEBIT',
      controlAccountType: 'ACCOUNTS_RECEIVABLE', allowManualPosting: false,
    },
  });
  cashAccountId = cash.id;
  revenueAccountId = revenue.id;
  controlAccountId = control.id;

  const current = monthRange(0);
  const previous = monthRange(-1);
  const fy = await prisma.fiscalYear.create({
    data: { tenantId: TENANT, code: FY_CODE, startDate: previous.start, endDate: current.end },
  });
  await prisma.accountingPeriod.create({
    data: {
      tenantId: TENANT, fiscalYearId: fy.id, periodNumber: 1, code: `${FY_CODE}-P1`,
      startDate: previous.start, endDate: previous.end, status: 'CLOSED',
    },
  });
  await prisma.accountingPeriod.create({
    data: {
      tenantId: TENANT, fiscalYearId: fy.id, periodNumber: 2, code: `${FY_CODE}-P2`,
      startDate: current.start, endDate: current.end, status: 'OPEN',
    },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Ledger integrity', () => {
  let postedEntryId: string;

  it('posts a balanced entry, allocates JE number, resolves period, writes audit event', async () => {
    const entry = await createDraftEntry({
      sourceType: 'TestInvoice',
      sourceId: `inv-1-${RUN}`,
      lines: [
        { accountId: cashAccountId, debit: 100, credit: 0 },
        { accountId: revenueAccountId, debit: 0, credit: 100 },
      ],
    });
    const journalNumber = await post(entry.id);
    expect(journalNumber).toBe(`JE-${FY_CODE}-000001`);

    const saved = await prisma.journalEntry.findUnique({ where: { id: entry.id } });
    expect(saved!.status).toBe('POSTED');
    expect(saved!.journalNumber).toBe(journalNumber);
    expect(saved!.accountingPeriodId).toBeTruthy();
    expect(saved!.postedAt).toBeTruthy();

    const audit = await prisma.systemAuditLog.findFirst({
      where: { tenantId: TENANT, action: 'JOURNAL_POSTED', recordId: entry.id },
    });
    expect(audit).toBeTruthy();
    expect(audit!.recordHash).toHaveLength(64);

    postedEntryId = entry.id;
  });

  it('rejects an unbalanced entry and does not consume a document number', async () => {
    const entry = await createDraftEntry({
      lines: [
        { accountId: cashAccountId, debit: 100, credit: 0 },
        { accountId: revenueAccountId, debit: 0, credit: 90 },
      ],
    });
    await expect(post(entry.id)).rejects.toThrow(/JOURNAL_UNBALANCED/);

    const balanced = await createDraftEntry({
      lines: [
        { accountId: cashAccountId, debit: 50, credit: 0 },
        { accountId: revenueAccountId, debit: 0, credit: 50 },
      ],
    });
    const journalNumber = await post(balanced.id);
    expect(journalNumber).toBe(`JE-${FY_CODE}-000002`);
  });

  it('rejects a line that carries both a debit and a credit', async () => {
    const entry = await prisma.journalEntry.create({
      data: { tenantId: TENANT, entryDate: new Date(), createdById: USER_A },
    });
    await expect(
      prisma.journalItem.create({
        data: {
          journalEntryId: entry.id, tenantId: TENANT, lineNumber: 1,
          accountId: cashAccountId, debit: 50, credit: 50,
          functionalDebit: 50, functionalCredit: 50,
        },
      }),
    ).rejects.toThrow(/chk_journal_item_amounts/);
  });

  it('rejects a zero-value line', async () => {
    const entry = await prisma.journalEntry.create({
      data: { tenantId: TENANT, entryDate: new Date(), createdById: USER_A },
    });
    await expect(
      prisma.journalItem.create({
        data: {
          journalEntryId: entry.id, tenantId: TENANT, lineNumber: 1,
          accountId: cashAccountId, debit: 0, credit: 0,
        },
      }),
    ).rejects.toThrow(/chk_journal_item_amounts/);
  });

  it('rejects entries with fewer than two lines', async () => {
    const entry = await createDraftEntry({
      lines: [{ accountId: cashAccountId, debit: 10, credit: 0 }],
    });
    await expect(post(entry.id)).rejects.toThrow(/JOURNAL_INCOMPLETE/);
  });

  it('blocks direct edits to a posted journal entry', async () => {
    await expect(
      prisma.journalEntry.update({ where: { id: postedEntryId }, data: { description: 'tampered' } }),
    ).rejects.toThrow(/JOURNAL_IMMUTABLE/);
  });

  it('blocks deleting a posted journal entry', async () => {
    await expect(
      prisma.journalEntry.delete({ where: { id: postedEntryId } }),
    ).rejects.toThrow(/JOURNAL_IMMUTABLE/);
  });

  it('blocks mutating and deleting items of a posted entry', async () => {
    const item = await prisma.journalItem.findFirst({ where: { journalEntryId: postedEntryId } });
    await expect(
      prisma.journalItem.update({ where: { id: item!.id }, data: { debit: 999999 } }),
    ).rejects.toThrow(/JOURNAL_ITEM_IMMUTABLE/);
    await expect(
      prisma.journalItem.delete({ where: { id: item!.id } }),
    ).rejects.toThrow(/JOURNAL_ITEM_IMMUTABLE/);
  });

  it('blocks setting status POSTED without the posting function', async () => {
    const entry = await createDraftEntry({
      lines: [
        { accountId: cashAccountId, debit: 10, credit: 0 },
        { accountId: revenueAccountId, debit: 0, credit: 10 },
      ],
    });
    await expect(
      prisma.journalEntry.update({ where: { id: entry.id }, data: { status: 'POSTED' } }),
    ).rejects.toThrow(/JOURNAL_POST_FORBIDDEN/);
  });

  it('prevents duplicate posting of the same source document', async () => {
    const dup = await createDraftEntry({
      sourceType: 'TestInvoice',
      sourceId: `inv-1-${RUN}`,
      lines: [
        { accountId: cashAccountId, debit: 100, credit: 0 },
        { accountId: revenueAccountId, debit: 0, credit: 100 },
      ],
    });
    await expect(post(dup.id)).rejects.toThrow(/DUPLICATE_POSTING/);
  });

  it('rejects posting into a closed accounting period', async () => {
    const lastMonth = monthRange(-1);
    const entry = await createDraftEntry({
      entryDate: new Date(lastMonth.start.getTime() + 24 * 3600 * 1000),
      lines: [
        { accountId: cashAccountId, debit: 20, credit: 0 },
        { accountId: revenueAccountId, debit: 0, credit: 20 },
      ],
    });
    await expect(post(entry.id)).rejects.toThrow(/PERIOD_CLOSED/);
  });

  it('rejects posting with no covering accounting period', async () => {
    const entry = await createDraftEntry({
      entryDate: new Date('1999-01-15'),
      lines: [
        { accountId: cashAccountId, debit: 20, credit: 0 },
        { accountId: revenueAccountId, debit: 0, credit: 20 },
      ],
    });
    await expect(post(entry.id)).rejects.toThrow(/PERIOD_NOT_FOUND/);
  });
});

describe('Segregation of duties and control accounts', () => {
  it('blocks self-posting an unapproved MANUAL journal', async () => {
    const entry = await createDraftEntry({
      journalType: 'MANUAL',
      createdById: USER_A,
      lines: [
        { accountId: cashAccountId, debit: 30, credit: 0 },
        { accountId: revenueAccountId, debit: 0, credit: 30 },
      ],
    });
    await expect(post(entry.id, USER_A)).rejects.toThrow(/SOD_VIOLATION/);
  });

  it('allows posting a MANUAL journal independently approved by another user', async () => {
    const entry = await createDraftEntry({
      journalType: 'MANUAL',
      createdById: USER_A,
      approvedById: USER_B,
      lines: [
        { accountId: cashAccountId, debit: 30, credit: 0 },
        { accountId: revenueAccountId, debit: 0, credit: 30 },
      ],
    });
    const journalNumber = await post(entry.id, USER_A);
    expect(journalNumber).toBe(`JE-${FY_CODE}-000003`);
  });

  it('blocks MANUAL postings to protected control accounts', async () => {
    const entry = await createDraftEntry({
      journalType: 'MANUAL',
      createdById: USER_A,
      approvedById: USER_B,
      lines: [
        { accountId: controlAccountId, debit: 40, credit: 0 },
        { accountId: revenueAccountId, debit: 0, credit: 40 },
      ],
    });
    await expect(post(entry.id, USER_A)).rejects.toThrow(/CONTROL_ACCOUNT_PROTECTED/);
  });
});

describe('Reversals', () => {
  let originalId: string;
  let reversalId: string;

  beforeAll(async () => {
    const entry = await createDraftEntry({
      sourceType: 'TestBill',
      sourceId: `bill-1-${RUN}`,
      lines: [
        { accountId: cashAccountId, debit: 75, credit: 0 },
        { accountId: revenueAccountId, debit: 0, credit: 75 },
      ],
    });
    await post(entry.id);
    originalId = entry.id;
  });

  it('requires a reason', async () => {
    await expect(reverse(originalId, USER_B, '')).rejects.toThrow(/REVERSAL_REASON_REQUIRED/);
  });

  it('creates a posted mirror entry with swapped debits and credits', async () => {
    reversalId = await reverse(originalId, USER_B, 'Duplicate billing detected');

    const reversal = await prisma.journalEntry.findUnique({
      where: { id: reversalId },
      include: { items: { orderBy: { lineNumber: 'asc' } } },
    });
    expect(reversal!.status).toBe('POSTED');
    expect(reversal!.journalType).toBe('REVERSAL');
    expect(reversal!.reversalOfJournalEntryId).toBe(originalId);
    expect(Number(reversal!.items[0].credit)).toBe(75);
    expect(Number(reversal!.items[0].debit)).toBe(0);
    expect(Number(reversal!.items[1].debit)).toBe(75);

    const original = await prisma.journalEntry.findUnique({ where: { id: originalId } });
    expect(original!.status).toBe('REVERSED');
    expect(original!.reversedByJournalEntryId).toBe(reversalId);
  });

  it('prevents a second reversal of the same entry', async () => {
    await expect(reverse(originalId, USER_B, 'again')).rejects.toThrow(/REVERSAL_INVALID_STATE|REVERSAL_DUPLICATE/);
  });
});

describe('Audit ledger', () => {
  it('verifies the tenant hash chain end to end', async () => {
    const rows = await prisma.$queryRaw<
      Array<{ is_valid: boolean; checked_count: bigint; broken_at_sequence: bigint | null; detail: string }>
    >`SELECT * FROM fn_verify_audit_chain(${TENANT})`;
    expect(rows[0].is_valid).toBe(true);
    expect(Number(rows[0].checked_count)).toBeGreaterThanOrEqual(4);
  });

  it('rejects direct inserts into the audit ledger', async () => {
    await expect(
      prisma.systemAuditLog.create({
        data: {
          tenantId: TENANT, eventSequence: 999999, action: 'FORGED', actionCategory: 'FINANCIAL',
          previousHash: 'x', recordHash: 'y',
        },
      }),
    ).rejects.toThrow(/AUDIT_DIRECT_INSERT_FORBIDDEN/);
  });

  it('rejects updates and deletes of audit rows', async () => {
    const row = await prisma.systemAuditLog.findFirst({ where: { tenantId: TENANT } });
    await expect(
      prisma.systemAuditLog.update({ where: { id: row!.id }, data: { reason: 'tampered' } }),
    ).rejects.toThrow(/AUDIT_IMMUTABLE/);
    await expect(
      prisma.systemAuditLog.delete({ where: { id: row!.id } }),
    ).rejects.toThrow(/AUDIT_IMMUTABLE/);
  });
});

describe('Document number register', () => {
  it('records every issued number and keeps the register immutable', async () => {
    const issued = await prisma.documentNumberHistory.findMany({
      where: { tenantId: TENANT, documentType: 'JOURNAL_ENTRY' },
      orderBy: { issuedAt: 'asc' },
    });
    expect(issued.length).toBeGreaterThanOrEqual(4);
    expect(new Set(issued.map(n => n.documentNumber)).size).toBe(issued.length);

    await expect(
      prisma.documentNumberHistory.update({
        where: { id: issued[0].id },
        data: { documentNumber: 'HACKED-001' },
      }),
    ).rejects.toThrow(/DOCNUM_IMMUTABLE/);
    await expect(
      prisma.documentNumberHistory.delete({ where: { id: issued[0].id } }),
    ).rejects.toThrow(/DOCNUM_IMMUTABLE/);
    await expect(
      prisma.documentNumberHistory.update({
        where: { id: issued[0].id },
        data: { status: 'VOIDED' },
      }),
    ).rejects.toThrow(/DOCNUM_VOID_REASON_REQUIRED/);
  });
});

describe('Idempotency records', () => {
  it('enforces unique (tenant, endpoint, key)', async () => {
    await prisma.idempotencyRecord.create({
      data: {
        tenantId: TENANT, endpoint: 'journal.post', idempotencyKey: `key-${RUN}`,
        payloadHash: 'abc',
      },
    });
    await expect(
      prisma.idempotencyRecord.create({
        data: {
          tenantId: TENANT, endpoint: 'journal.post', idempotencyKey: `key-${RUN}`,
          payloadHash: 'different',
        },
      }),
    ).rejects.toThrow();
  });
});

describe('Accounting periods', () => {
  it('never allows a LOCKED period to reopen', async () => {
    const fy = await prisma.fiscalYear.findFirst({ where: { tenantId: TENANT } });
    const locked = await prisma.accountingPeriod.create({
      data: {
        tenantId: TENANT, fiscalYearId: fy!.id, periodNumber: 99, code: `${FY_CODE}-P99`,
        startDate: new Date('1998-01-01'), endDate: new Date('1998-01-31'), status: 'LOCKED',
      },
    });
    await expect(
      prisma.accountingPeriod.update({ where: { id: locked.id }, data: { status: 'OPEN' } }),
    ).rejects.toThrow(/PERIOD_LOCKED/);
    await expect(
      prisma.accountingPeriod.delete({ where: { id: locked.id } }),
    ).rejects.toThrow(/PERIOD_IMMUTABLE/);
  });
});
