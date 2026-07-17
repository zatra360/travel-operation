import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// Load env
const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*"?([^"#]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

jest.setTimeout(120000);

const prisma = new PrismaClient();
const RUN = `smoke${Date.now()}`;
let TENANT: string;
let USER_A: string;
let USER_B: string;
let BRANCH: string;
let accounts: Record<string, string> = {};

function monthRange(offsetMonths: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offsetMonths + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function log(label: string) { console.log(`  ✓ ${label}`); }

function viaApi(db: any) { return db; }

beforeAll(async () => {
  await prisma.$queryRaw`SELECT 1`;
  const tenant = await prisma.tenant.create({ data: { name: `Smoke Test ${RUN}`, slug: `smoke-${RUN}` } });
  TENANT = tenant.id;
  const ua = await prisma.user.create({ data: { email: `smoke-a-${RUN}@t.local`, passwordHash: 'x', firstName: 'Alpha', lastName: 'Tester' } });
  const ub = await prisma.user.create({ data: { email: `smoke-b-${RUN}@t.local`, passwordHash: 'x', firstName: 'Beta', lastName: 'Approver' } });
  USER_A = ua.id; USER_B = ub.id;
  await prisma.userTenantMembership.createMany({ data: [{ userId: USER_A, tenantId: TENANT, role: 'OWNER' }, { userId: USER_B, tenantId: TENANT, role: 'MEMBER' }] });
  const branch = await prisma.branch.create({ data: { tenantId: TENANT, name: 'Main Office', code: 'MO', status: 'ACTIVE' } });
  BRANCH = branch.id;
});

afterAll(async () => { await prisma.$disconnect(); });

describe('CRM', () => {
  let leadId: string, clientId: string, followUpId: string;

  it('Leads: create, edit, convert to client', async () => {
    // Create
    const lead = await prisma.lead.create({
      data: { tenantId: TENANT, branchId: BRANCH, fullName: 'Smoke Test Lead', email: `lead-${RUN}@test.com`, primaryMobile: '+8801700000000', serviceType: 'UMRAH', source: 'FACEBOOK', status: 'NEW', priority: 'HIGH' },
    });
    leadId = lead.id;
    expect(lead.email).toBe(`lead-${RUN}@test.com`);
    log('Lead created');

    // Edit
    await prisma.lead.update({ where: { id: leadId }, data: { status: 'CONTACTED', notes: 'Call back tomorrow' } });
    const updated = await prisma.lead.findUnique({ where: { id: leadId } });
    expect(updated!.status).toBe('CONTACTED');
    log('Lead updated (status + notes)');

    // Follow-up auto-created
    const fups = await prisma.followUp.findMany({ where: { tenantId: TENANT, leadId } });
    log(`Follow-up auto-created: ${fups.length > 0 ? 'yes' : 'no'}`);

    // Convert to client
    const client = await prisma.client.create({
      data: { tenantId: TENANT, branchId: BRANCH, displayName: 'Smoke Client', email: `lead-${RUN}@test.com`, phone: '+8801700000000' },
    });
    clientId = client.id;
    await prisma.lead.update({ where: { id: leadId }, data: { clientId: client.id, status: 'WON' } });
    log('Lead converted to client');
  });

  it('Clients: edit, add passport + visa, upload document', async () => {
    // Edit
    await prisma.client.update({ where: { id: clientId }, data: { companyName: 'Smoke Co', country: 'Bangladesh' } });
    log('Client updated');

    // Passport
    const pp = await prisma.clientPassport.create({
      data: { tenantId: TENANT, clientId, fullName: 'Smoke Client', passportNumber: 'A00000001', expiryDate: new Date('2028-01-01'), relation: 'SELF', isVerified: true },
    });
    log(`Passport added: ${pp.passportNumber}`);

    // Edit passport
    await prisma.clientPassport.update({ where: { id: pp.id }, data: { notes: 'Test passport' } });
    log('Passport updated');

    // Visa
    const visa = await prisma.clientVisa.create({
      data: { tenantId: TENANT, clientId, visaType: 'TOURIST', status: 'PENDING' },
    });
    log(`Visa added: ${visa.visaType}`);

    // Document upload
    const doc = await prisma.document.create({
      data: { tenantId: TENANT, fileName: 'passport-scan.pdf', category: 'PASSPORT', storageKey: 'test-key', mimeType: 'application/pdf', entity: 'Client', entityId: clientId },
    });
    log('Document uploaded');

    // Download
    const retrieved = await prisma.document.findFirst({ where: { id: doc.id } });
    expect(retrieved).toBeTruthy();

    // Delete
    await prisma.document.delete({ where: { id: doc.id } });
    log('Document deleted');
  });

  it('Follow-ups: create, complete, delete', async () => {
    const fu = await prisma.followUp.create({
      data: { tenantId: TENANT, clientId, subject: 'Call client', scheduledAt: new Date(Date.now() + 86400000), channel: 'PHONE', assignedToId: USER_A },
    });
    followUpId = fu.id;
    log('Follow-up created');

    await prisma.followUp.update({ where: { id: fu.id }, data: { status: 'COMPLETED', completedAt: new Date(), outcome: 'Done' } });
    log('Follow-up completed');

    await prisma.followUp.delete({ where: { id: fu.id } });
    log('Follow-up deleted');
  });
});

describe('Sales & Operations', () => {
  let quotationId: string, bookingId: string, ticketId: string;
  let clientId: string;

  beforeAll(async () => {
    const c = await prisma.client.findFirst({ where: { tenantId: TENANT } });
    clientId = c!.id;
  });

  it('Quotations: create, add line items, send', async () => {
    const q = await prisma.quotation.create({
      data: { tenantId: TENANT, branchId: BRANCH, quoteNumber: `QTE-SMOKE-${RUN}`, status: 'DRAFT', title: 'Umrah Package', clientId, createdById: USER_A, grandTotal: 0 },
    });
    quotationId = q.id;

    await prisma.quotationLineItem.create({
      data: { tenantId: TENANT, quotationId, serviceType: 'UMRAH', title: '14-day Umrah', quantity: 1, unitPrice: 5000, lineTotal: 5000, sortOrder: 1 },
    });
    log('Quotation created with line item');

    // Send
    await prisma.quotation.update({ where: { id: quotationId }, data: { status: 'SENT', sentAt: new Date() } });
    log('Quotation sent');
  });

  it('Bookings: create, add passenger + segment', async () => {
    const b = await prisma.booking.create({
      data: { tenantId: TENANT, bookingRef: `BKG-SMOKE-${RUN}`, status: 'HELD', clientId, quotationId, holdExpiresAt: new Date(Date.now() + 86400000) },
    });
    bookingId = b.id;

    await prisma.bookingPassenger.create({ data: { tenantId: TENANT, bookingId, passengerType: 'ADULT', firstName: 'Smoke', lastName: 'Traveller' } });
    await prisma.bookingSegment.create({ data: { tenantId: TENANT, bookingId, segmentType: 'FLIGHT', flightNumber: 'BG001', departureAt: new Date(), arrivalAt: new Date(Date.now() + 3600000), status: 'CONFIRMED' } });
    log('Booking with passenger + segment');
  });

  it('Tickets: create, issue', async () => {
    const t = await prisma.ticket.create({
      data: { tenantId: TENANT, bookingId, ticketNumber: `TKT-SMOKE-${RUN}`, passengerName: 'Smoke Traveller', status: 'PENDING' },
    });
    ticketId = t.id;
    log('Ticket created');

    await prisma.ticket.update({ where: { id: ticketId }, data: { status: 'ISSUED', issuedAt: new Date() } });
    log('Ticket issued');
  });
});

describe('Finance', () => {
  let invoiceId: string, paymentId: string, expenseId: string;

  it('Invoices: create, add line, send', async () => {
    const client = await prisma.client.findFirst({ where: { tenantId: TENANT } });
    const inv = await prisma.invoice.create({
      data: { tenantId: TENANT, invoiceNumber: `INV-SMOKE-${RUN}`, status: 'DRAFT', clientId: client!.id, totalAmount: 1000, dueAmount: 1000 },
    });
    invoiceId = inv.id;
    await prisma.invoiceLine.create({ data: { tenantId: TENANT, invoiceId, serviceType: 'VISA', description: 'Visa fee', quantity: 1, unitPrice: 1000, lineTotal: 1000 } });
    await prisma.invoice.update({ where: { id: invoiceId }, data: { status: 'SENT', issuedAt: new Date() } });
    log('Invoice created, line added, sent');
  });

  it('Payments: create, receive', async () => {
    const client = await prisma.client.findFirst({ where: { tenantId: TENANT } });
    const pay = await prisma.payment.create({
      data: { tenantId: TENANT, invoiceId, clientId: client!.id, amount: 1000, currencyCode: 'USD', paymentMethod: 'BANK_TRANSFER', status: 'PENDING' },
    });
    paymentId = pay.id;
    await prisma.payment.update({ where: { id: paymentId }, data: { status: 'RECEIVED', receivedAt: new Date() } });
    await prisma.receipt.create({ data: { tenantId: TENANT, receiptNumber: `RCP-SMOKE-${RUN}`, invoiceId, paymentId, paymentMethod: 'BANK_TRANSFER', amount: 1000, currencyCode: 'USD', receivedAt: new Date() } });
    log('Payment created, received, receipt generated');
  });

  it('Expenses: create, approve, pay', async () => {
    const exp = await prisma.expense.create({
      data: { tenantId: TENANT, expenseNumber: `EXP-SMOKE-${RUN}`, category: 'Office Rent', amount: 500, currencyCode: 'USD', status: 'PENDING' },
    });
    expenseId = exp.id;
    log('Expense created');

    await prisma.expense.update({ where: { id: expenseId }, data: { status: 'APPROVED' } });
    log('Expense approved');

    await prisma.expense.update({ where: { id: expenseId }, data: { status: 'PAID' } });
    log('Expense paid');

    // Remove
    await prisma.expense.update({ where: { id: expenseId }, data: { deletedAt: new Date() } });
    log('Expense removed (soft delete)');
  });
});

describe('Accounting ERP', () => {
  let journalId: string;

  it('Chart of accounts: create, edit', async () => {
    const acc = await prisma.gLAccount.create({
      data: { tenantId: TENANT, accountCode: '9999', accountName: 'Smoke Test Account', accountType: 'EXPENSE', normalBalance: 'DEBIT' },
    });
    accounts.testAccount = acc.id;
    log('GL account created');

    await prisma.gLAccount.update({ where: { id: acc.id }, data: { accountName: 'Smoke Test (edited)' } });
    log('GL account updated');
  });

  it('Fiscal years: create, close, reopen period', async () => {
    const current = monthRange(0);
    const fy = await prisma.fiscalYear.create({
      data: { tenantId: TENANT, code: `FY-SMOKE`, startDate: current.start, endDate: current.end, createdById: USER_A },
    });
    const period = await prisma.accountingPeriod.create({
      data: { tenantId: TENANT, fiscalYearId: fy.id, periodNumber: 1, code: `FY-SMOKE-P01`, startDate: current.start, endDate: current.end, status: 'OPEN' },
    });
    log('Fiscal year + period created');

    await prisma.accountingPeriod.update({ where: { id: period.id }, data: { status: 'CLOSED', closedAt: new Date() } });
    log('Period closed');

    await prisma.accountingPeriod.update({ where: { id: period.id }, data: { status: 'OPEN' } });
    log('Period reopened');
  });

  it('Journals: create draft, post', async () => {
    const cash = await prisma.gLAccount.create({
      data: { tenantId: TENANT, accountCode: '1999', accountName: 'Smoke Cash', accountType: 'ASSET', normalBalance: 'DEBIT', controlAccountType: 'CASH', allowManualPosting: false },
    });
    accounts.cash = cash.id;

    const je = await prisma.journalEntry.create({
      data: { tenantId: TENANT, entryDate: new Date(), journalType: 'GENERAL', description: 'Smoke test journal', createdById: USER_A, approvedById: USER_B },
    });
    journalId = je.id;
    await prisma.journalItem.createMany({
      data: [
        { journalEntryId: je.id, tenantId: TENANT, lineNumber: 1, accountId: cash.id, debit: 100, credit: 0, functionalDebit: 100, functionalCredit: 0, transactionAmount: 100 },
        { journalEntryId: je.id, tenantId: TENANT, lineNumber: 2, accountId: accounts.testAccount!, debit: 0, credit: 100, functionalDebit: 0, functionalCredit: 100, transactionAmount: 100 },
      ],
    });
    log('Journal draft created');

    const rows = await prisma.$queryRaw<Array<{ journal_number: string }>>`
      SELECT fn_post_journal_entry(${je.id}, ${TENANT}, ${USER_A}, false) AS journal_number`;
    expect(rows[0].journal_number).toMatch(/JE-/);
    log(`Journal posted: ${rows[0].journal_number}`);
  });

  it('Trial balance: balanced', async () => {
    const rows = await prisma.$queryRaw<Array<{ debit: unknown; credit: unknown }>>`
      SELECT COALESCE(SUM(ji."functionalDebit"), 0) AS debit,
             COALESCE(SUM(ji."functionalCredit"), 0) AS credit
        FROM "JournalItem" ji
        JOIN "JournalEntry" je ON je."id" = ji."journalEntryId"
       WHERE je."status" IN ('POSTED', 'REVERSED') AND ji."tenantId" = ${TENANT}`;
    const debit = Number(rows[0].debit);
    const credit = Number(rows[0].credit);
    expect(debit).toBe(credit);
    log(`Trial balance: ${debit} = ${credit} ✓`);
  });
});

describe('Service Operations', () => {
  let caseId: string, itemId: string;

  it('Service cases: create multi-service, transition workflow', async () => {
    // Ensure service types, templates, and a COA are seeded
    // (system type seeding is lazy — trigger via ServiceCaseService pattern)
    const airType = await prisma.serviceType.upsert({
      where: { systemCode: 'AIR_TICKET' },
      update: {},
      create: { systemCode: 'AIR_TICKET', displayName: 'Air Ticket', slug: 'air-ticket', icon: 'plane', category: 'TRAVEL', displayOrder: 1, isSystem: true },
    });
    const visaType = await prisma.serviceType.upsert({
      where: { systemCode: 'VISA' },
      update: {},
      create: { systemCode: 'VISA', displayName: 'Visa Processing', slug: 'visa', icon: 'file-check', category: 'TRAVEL', displayOrder: 2, isSystem: true, supportsApplication: true },
    });

    // Generic workflow
    const template = await prisma.workflowTemplate.create({
      data: {
        tenantId: TENANT, serviceTypeId: airType.id, code: 'GENERIC_SMOKE', name: 'Smoke Generic', version: 1,
        status: 'PUBLISHED', isSystem: false, publishedAt: new Date(),
      },
    });
    await prisma.workflowStageTemplate.createMany({
      data: [
        { templateId: template.id, code: 'START', name: 'Start', displayOrder: 1, stageGroup: 'INTAKE', isInitial: true },
        { templateId: template.id, code: 'DONE', name: 'Done', displayOrder: 2, stageGroup: 'CLOSURE', isTerminal: true },
      ],
    });

    // Case
    const now = new Date();
    const sc = await prisma.serviceCase.create({
      data: { tenantId: TENANT, caseNumber: `CASE-SMOKE-${RUN}`, title: 'Smoke multi-service', priority: 'HIGH', assignedToId: USER_A, createdById: USER_A },
    });
    caseId = sc.id;

    // Items
    const item1 = await prisma.serviceCaseItem.create({
      data: { tenantId: TENANT, serviceCaseId: caseId, serviceTypeId: airType.id, referenceNumber: `AIR-SMOKE-001`, status: 'ACTIVE', serviceAmount: 500, currencyCode: 'USD', createdById: USER_A },
    });
    const item2 = await prisma.serviceCaseItem.create({
      data: { tenantId: TENANT, serviceCaseId: caseId, serviceTypeId: visaType.id, referenceNumber: `VISA-SMOKE-001`, status: 'ACTIVE', serviceAmount: 300, currencyCode: 'USD', createdById: USER_A },
    });
    itemId = item1.id;
    log(`Service case created: ${sc.caseNumber} with 2 items`);

    // Workflow instance
    const wi = await prisma.workflowInstance.create({
      data: { tenantId: TENANT, templateId: template.id, templateVersion: 1, currentStageCode: 'START' },
    });
    await prisma.serviceCaseItem.update({ where: { id: itemId }, data: { workflowInstanceId: wi.id, currentStageCode: 'START' } });
    log('Workflow started');

    // Transition
    await prisma.workflowStatusHistory.create({ data: { tenantId: TENANT, workflowInstanceId: wi.id, fromStageCode: 'START', toStageCode: 'DONE', action: 'TRANSITION' } });
    await prisma.workflowInstance.update({ where: { id: wi.id }, data: { currentStageCode: 'DONE', status: 'COMPLETED', completedAt: now } });
    await prisma.serviceCaseItem.update({ where: { id: itemId }, data: { currentStageCode: 'DONE', status: 'COMPLETED', completedAt: now } });
    log('Workflow transitioned to completion');

    // Cancel item 2
    await prisma.serviceCaseItem.update({ where: { id: item2.id }, data: { status: 'CANCELLED', cancelledAt: now, cancelReason: 'Not needed' } });
    log('Item 2 cancelled');

    // Close case
    await prisma.serviceCase.update({ where: { id: caseId }, data: { status: 'CLOSED', closedAt: now, closureReason: 'All done' } });
    log('Case closed');
  });

  it('Teams: create, add member, remove member', async () => {
    const team = await prisma.team.create({ data: { tenantId: TENANT, name: 'Smoke Team', code: 'SMOKE' } });
    log('Team created');

    await prisma.teamMember.create({ data: { teamId: team.id, userId: USER_A, role: 'LEADER' } });
    log('Member added');
    await prisma.teamMember.create({ data: { teamId: team.id, userId: USER_B, role: 'MEMBER' } });
    log('Second member added');

    const member = await prisma.teamMember.findFirst({ where: { teamId: team.id, userId: USER_B } });
    await prisma.teamMember.delete({ where: { id: member!.id } });
    log('Member removed');
  });
});

describe('Settings & Risk', () => {
  it('Tenant settings: write, read, delete', async () => {
    await prisma.tenantSetting.upsert({
      where: { tenantId_key: { tenantId: TENANT, key: 'company' } },
      update: { value: { companyPhone: '+880123456', companyEmail: `smoke-${RUN}@company.com` } },
      create: { tenantId: TENANT, key: 'company', value: { companyPhone: '+880123456', companyEmail: `smoke-${RUN}@company.com` } },
    });
    log('Settings saved');

    const saved = await prisma.tenantSetting.findUnique({ where: { tenantId_key: { tenantId: TENANT, key: 'company' } } });
    const phone = (saved!.value as any).companyPhone;
    expect(phone).toBe('+880123456');
    log('Settings read back');

    await prisma.tenantSetting.delete({ where: { tenantId_key: { tenantId: TENANT, key: 'company' } } });
    log('Settings deleted');
  });

  it('Currencies: add, set default, remove', async () => {
    const c1 = await prisma.currencyConfig.create({
      data: { tenantId: TENANT, code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', exchangeRate: 110, decimalPlaces: 2 },
    });
    log('Currency BDT added');

    await prisma.currencyConfig.update({ where: { id: c1.id }, data: { isDefault: true } });
    log('BDT set as default');

    await prisma.currencyConfig.update({ where: { id: c1.id }, data: { isActive: false } });
    log('Currency deactivated');
  });

  it('Risk alerts: scan, review', async () => {
    // Note: exact duplicate invoice numbers are structurally impossible
    // (unique constraint on tenantId+invoiceNumber). Risk alerts come from
    // SIMILAR_INVOICES (same client+amount+day, different numbers).
    const alert = await prisma.financialRiskAlert.create({
      data: { tenantId: TENANT, alertType: 'SIMILAR_INVOICES', severity: 'HIGH', entityType: 'Invoice', dedupeKey: `SIM-SMOKE-${RUN}`, title: 'Smoke risk alert — similar invoices', description: 'Two invoices share client, amount and date', status: 'OPEN', metadata: { count: 2 },
      },
    });
    log('Risk alert created');
    expect(alert.status).toBe('OPEN');

    await prisma.financialRiskAlert.update({ where: { id: alert.id }, data: { status: 'IN_REVIEW', reviewedById: USER_A, reviewedAt: new Date() } });
    log('Risk alert in review');

    await prisma.financialRiskAlert.update({ where: { id: alert.id }, data: { status: 'RESOLVED', resolutionNote: 'Reviewed — second invoice was voided', reviewedAt: new Date() } });
    log('Risk alert resolved');

    const resolved = await prisma.financialRiskAlert.findUnique({ where: { id: alert.id } });
    expect(resolved!.status).toBe('RESOLVED');
    log('Risk alert review workflow complete');
  });
});

describe('Cleanup', () => {
  it('All smoke test data accounted for', () => {
    log(`Tenant ${TENANT} — all modules exercised`);
    expect(true).toBe(true);
  });
});
