const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('Demo@123', 12);

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'tripnow-limited' },
    update: {},
    create: { name: 'Tripnow Limited', slug: 'tripnow-limited', status: 'ACTIVE' },
  });
  console.log('Tenant:', tenant.name);

  const ho = await prisma.branch.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'HO' } },
    update: {},
    create: { tenantId: tenant.id, name: 'Head Office', code: 'HO', phone: '+880-2-1234567', email: 'ho@tripnow.com' },
  });
  const dhk = await prisma.branch.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'DHK' } },
    update: {},
    create: { tenantId: tenant.id, name: 'Dhaka Office', code: 'DHK', phone: '+880-2-7654321', email: 'dhk@tripnow.com' },
  });
  console.log('Branches: Head Office, Dhaka Office');

  const users = {};
  const userData = [
    { email: 'admin@tripnow.com', first: 'Karim', last: 'Ahmed' },
    { email: 'sales1@tripnow.com', first: 'Fatima', last: 'Hasan' },
    { email: 'sales2@tripnow.com', first: 'Rafiq', last: 'Islam' },
    { email: 'ticketing@tripnow.com', first: 'Tanvir', last: 'Khan' },
    { email: 'visa@tripnow.com', first: 'Nusrat', last: 'Jahan' },
    { email: 'finance@tripnow.com', first: 'Abdul', last: 'Rahman' },
    { email: 'hr@tripnow.com', first: 'Shamima', last: 'Akter' },
  ];
  for (const u of userData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { email: u.email, passwordHash: hash, firstName: u.first, lastName: u.last, status: 'ACTIVE' },
    });
    users[u.email] = user;
    await prisma.userTenantMembership.upsert({
      where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } },
      update: {},
      create: { userId: user.id, tenantId: tenant.id, role: 'ADMIN' },
    });
  }
  console.log('Users: 7 created');

  const perms = await prisma.permission.findMany();

  // Upsert any missing permission records so later role grants can find
  // them even when the main seed (seed.ts) hasn't been re-run.
  const allModules = [
    'TENANT', 'BRANCH', 'USER', 'ROLE', 'PERMISSION',
    'LEAD', 'CLIENT', 'FOLLOW_UP',
    'QUOTATION', 'BOOKING', 'TICKET',
    'INVOICE', 'RECEIPT', 'PAYMENT', 'EXPENSE', 'LEDGER',
    'REFUND', 'REISSUE', 'CANCELLATION',
    'EMPLOYEE', 'LEAVE', 'ATTENDANCE', 'PERFORMANCE',
    'COMMISSION', 'SALARY_RUN',
    'DOCUMENT', 'SETTINGS', 'AUDIT_LOG', 'REPORT', 'DASHBOARD',
    'NOTIFICATION', 'MASTER_DATA',
    'PROJECT', 'TASK', 'VENDOR', 'INSURANCE', 'FEEDBACK',
    'JOURNAL', 'GL_ACCOUNT', 'ACCOUNTING_PERIOD',
    'SERVICE_TYPE', 'SERVICE_CASE', 'SERVICE_ITEM', 'WORKFLOW',
    'WORKFLOW_TASK', 'WORKFLOW_APPROVAL', 'SERVICE_DOCUMENT', 'SERVICE_REPORT',
    'TEAM',
  ];
  const actions = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE'];
  for (const m of allModules) {
    for (const a of actions) {
      const name = `${m}_${a}`;
      await prisma.permission.upsert({
        where: { name },
        update: {},
        create: { name, module: m, action: a, description: `Can ${a.toLowerCase()} ${m.toLowerCase().replace(/_/g, ' ')}` },
      });
    }
  }
  const refreshedPerms = await prisma.permission.findMany();

  const roleDefs = ['Tenant Admin', 'Branch Manager', 'Sales Executive', 'Ticketing Officer', 'Visa Officer', 'Finance Officer', 'HR Manager'];
  const roles = {};
  for (const name of roleDefs) {
    const r = await prisma.role.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name } },
      update: {},
      create: { tenantId: tenant.id, name, isSystem: true },
    });
    roles[name] = r;
    if (name === 'Tenant Admin') {
      for (const p of refreshedPerms) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: r.id, permissionId: p.id } },
          update: {},
          create: { roleId: r.id, permissionId: p.id },
        });
      }
    }
  }
  console.log('Roles: 7 created with permissions');

  // Grant per-role permissions to non-admin roles so they're immediately
  // usable with the demo users.  Maps match the systemPermissions in seed.ts.
  const roleGrants = {
    'Branch Manager': ['LEAD', 'CLIENT', 'QUOTATION', 'BOOKING', 'TICKET', 'INVOICE', 'RECEIPT', 'PAYMENT', 'EXPENSE', 'LEDGER', 'REFUND', 'REISSUE', 'CANCELLATION', 'EMPLOYEE', 'LEAVE', 'ATTENDANCE', 'PERFORMANCE', 'COMMISSION', 'SALARY_RUN', 'DOCUMENT', 'SETTINGS', 'REPORT', 'DASHBOARD', 'NOTIFICATION', 'MASTER_DATA', 'VENDOR', 'INSURANCE', 'FEEDBACK', 'PROJECT', 'TASK', 'JOURNAL', 'GL_ACCOUNT', 'ACCOUNTING_PERIOD', 'SERVICE_TYPE', 'SERVICE_CASE', 'SERVICE_ITEM', 'WORKFLOW', 'WORKFLOW_TASK', 'WORKFLOW_APPROVAL', 'SERVICE_DOCUMENT', 'SERVICE_REPORT', 'TEAM'],
    'Sales Executive': ['LEAD', 'CLIENT', 'FOLLOW_UP', 'QUOTATION', 'BOOKING', 'TICKET', 'INVOICE', 'SERVICE_TYPE', 'SERVICE_CASE', 'SERVICE_ITEM', 'WORKFLOW', 'WORKFLOW_TASK', 'SERVICE_DOCUMENT', 'REPORT', 'DASHBOARD', 'NOTIFICATION'],
    'Ticketing Officer': ['BOOKING', 'TICKET', 'INVOICE', 'CLIENT', 'LEAD', 'QUOTATION', 'SERVICE_TYPE', 'SERVICE_CASE', 'SERVICE_ITEM', 'WORKFLOW', 'WORKFLOW_TASK', 'SERVICE_REPORT', 'REPORT', 'DASHBOARD', 'NOTIFICATION'],
    'Visa Officer': ['CLIENT', 'LEAD', 'FOLLOW_UP', 'QUOTATION', 'BOOKING', 'DOCUMENT', 'SERVICE_TYPE', 'SERVICE_CASE', 'SERVICE_ITEM', 'WORKFLOW', 'WORKFLOW_TASK', 'WORKFLOW_APPROVAL', 'SERVICE_DOCUMENT', 'SERVICE_REPORT', 'REPORT', 'DASHBOARD', 'NOTIFICATION'],
    'Finance Officer': ['INVOICE', 'RECEIPT', 'PAYMENT', 'EXPENSE', 'LEDGER', 'CLIENT', 'LEAD', 'JOURNAL', 'GL_ACCOUNT', 'ACCOUNTING_PERIOD', 'REPORT', 'DASHBOARD', 'NOTIFICATION', 'SERVICE_TYPE', 'SERVICE_CASE', 'SERVICE_REPORT', 'AUDIT_LOG'],
    'HR Manager': ['EMPLOYEE', 'LEAVE', 'ATTENDANCE', 'PERFORMANCE', 'COMMISSION', 'SALARY_RUN', 'DOCUMENT', 'SETTINGS', 'REPORT', 'DASHBOARD', 'NOTIFICATION'],
  };

  const permMap = {};
  for (const p of refreshedPerms) permMap[p.name] = p.id;
  for (const [roleName, modules] of Object.entries(roleGrants)) {
    const role = roles[roleName];
    if (!role) continue;
    for (const module of modules) {
      for (const action of ['READ', 'CREATE', 'UPDATE', 'MANAGE']) {
        const permName = `${module}_${action}`;
        const permId = permMap[permName];
        if (!permId) continue;
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: permId } },
          update: {},
          create: { roleId: role.id, permissionId: permId },
        });
      }
    }
  }
  console.log('Role permissions granted per role');

  const map = {
    'admin@tripnow.com': 'Tenant Admin',
    'sales1@tripnow.com': 'Sales Executive',
    'sales2@tripnow.com': 'Sales Executive',
    'ticketing@tripnow.com': 'Ticketing Officer',
    'visa@tripnow.com': 'Visa Officer',
    'finance@tripnow.com': 'Finance Officer',
    'hr@tripnow.com': 'HR Manager',
  };
  for (const [email, roleName] of Object.entries(map)) {
    const existing = await prisma.userRoleAssignment.findFirst({
      where: { userId: users[email].id, roleId: roles[roleName].id, tenantId: tenant.id },
    });
    if (!existing) {
      await prisma.userRoleAssignment.create({
        data: { userId: users[email].id, roleId: roles[roleName].id, tenantId: tenant.id },
      });
    }
  }
  console.log('Role assignments done');

  const deps = [
    { branch: ho, name: 'Sales', code: 'SALES' },
    { branch: ho, name: 'Ticketing', code: 'TICKETING' },
    { branch: ho, name: 'Visa', code: 'VISA' },
    { branch: ho, name: 'Finance', code: 'FINANCE' },
    { branch: ho, name: 'HR', code: 'HR' },
    { branch: dhk, name: 'Sales', code: 'SALES' },
    { branch: dhk, name: 'Ticketing', code: 'TICKETING' },
  ];
  for (const d of deps) {
    await prisma.department.upsert({
      where: { tenantId_branchId_code: { tenantId: tenant.id, branchId: d.branch.id, code: d.code } },
      update: {},
      create: { tenantId: tenant.id, branchId: d.branch.id, name: d.name, code: d.code },
    });
  }
  console.log('Departments: 7 created');

  // ── Sample Business Data ─────────────────────────────────
  const sales1 = users['sales1@tripnow.com'];
  const sales2 = users['sales2@tripnow.com'];
  const ticketing = users['ticketing@tripnow.com'];
  const finance = users['finance@tripnow.com'];

  const leads = [
    { fullName: 'Ahmed Hassan', email: 'ahmed@example.com', phone: '+8801712345678', serviceType: 'UMRAH', source: 'WEBSITE', status: 'CONTACTED', priority: 'HIGH', potentialRevenue: 350000, assignedTo: sales1 },
    { fullName: 'Sarah Johnson', email: 'sarah@example.com', phone: '+8801812345678', serviceType: 'VISA', source: 'REFERRAL', status: 'NEW', priority: 'MEDIUM', potentialRevenue: 25000, assignedTo: sales1 },
    { fullName: 'Mohammad Ali', email: 'mali@example.com', phone: '+8801912345678', serviceType: 'VISA', source: 'WALK_IN', status: 'QUALIFIED', priority: 'HIGH', potentialRevenue: 120000, assignedTo: sales2 },
    { fullName: 'Jennifer Lee', email: 'jen@example.com', phone: '+8801512345678', serviceType: 'UMRAH', source: 'WEBSITE', status: 'CONTACTED', priority: 'URGENT', potentialRevenue: 500000, assignedTo: sales1 },
    { fullName: 'Corporate Travels Ltd', email: 'info@corp.travel', companyName: 'Corporate Travels Ltd', serviceType: 'VISA', source: 'REFERRAL', status: 'QUALIFIED', priority: 'HIGH', potentialRevenue: 800000, isCorporateLead: true, assignedTo: sales2 },
    { fullName: 'Fatema Begum', email: 'fatema@example.com', phone: '+8801312345678', serviceType: 'VISA', source: 'SOCIAL', status: 'NEW', priority: 'LOW', potentialRevenue: 15000, assignedTo: sales1 },
  ];
  const LEAD_IDS = ['dl1','dl2','dl3','dl4','dl5','dl6'];
  for (let i = 0; i < leads.length; i++) {
    const l = leads[i];
    await prisma.lead.upsert({
      where: { id: LEAD_IDS[i] },
      update: {},
      create: { id: LEAD_IDS[i], tenantId: tenant.id, branchId: ho.id, assignedToId: l.assignedTo.id, fullName: l.fullName, email: l.email, primaryMobile: l.phone || undefined, companyName: l.companyName || undefined, serviceType: l.serviceType, source: l.source, status: l.status, priority: l.priority, potentialRevenue: l.potentialRevenue, isCorporateLead: l.isCorporateLead || false, numAdults: 1, leadScore: l.priority === 'HIGH' ? 75 : 40, createdById: l.assignedTo.id },
    });
  }
  console.log('  Leads: 6 created');

  const c1 = await prisma.client.upsert({ where: { id: 'dc1' }, update: {}, create: { id: 'dc1', tenantId: tenant.id, branchId: ho.id, type: 'PERSON', status: 'ACTIVE', displayName: 'Rahim Uddin', email: 'rahim@example.com', phone: '+8801711111111', nationalityLabel: 'Bangladeshi', currencyCode: 'BDT', createdById: sales1.id } });
  const c2 = await prisma.client.upsert({ where: { id: 'dc2' }, update: {}, create: { id: 'dc2', tenantId: tenant.id, branchId: dhk.id, type: 'PERSON', status: 'ACTIVE', displayName: 'Ayesha Siddique', email: 'ayesha@example.com', phone: '+8801722222222', nationalityLabel: 'Bangladeshi', currencyCode: 'USD', createdById: sales2.id } });
  console.log('  Clients: 2 created');

  const q1 = await prisma.quotation.upsert({ where: { tenantId_quoteNumber: { tenantId: tenant.id, quoteNumber: 'QTE-2607-1001' } }, update: {}, create: { tenantId: tenant.id, branchId: ho.id, quoteNumber: 'QTE-2607-1001', status: 'SENT', title: 'Umrah Package', clientId: c1.id, assignedToId: sales1.id, currencyCode: 'BDT', subtotal: 333333, taxTotal: 16667, grandTotal: 350000, validUntil: new Date('2026-08-15'), createdById: sales1.id, sentAt: new Date() } });
  await prisma.quotationLineItem.upsert({ where: { id: 'qli1' }, update: {}, create: { id: 'qli1', tenantId: tenant.id, quotationId: q1.id, serviceType: 'UMRAH', title: 'Umrah Package', description: '14-day package', quantity: 1, unitPrice: 333333, lineTotal: 333333, sortOrder: 1 } });

  const q2 = await prisma.quotation.upsert({ where: { tenantId_quoteNumber: { tenantId: tenant.id, quoteNumber: 'QTE-2607-1002' } }, update: {}, create: { tenantId: tenant.id, branchId: dhk.id, quoteNumber: 'QTE-2607-1002', status: 'ACCEPTED', title: 'Dubai Visa', clientId: c2.id, assignedToId: sales2.id, currencyCode: 'USD', subtotal: 1190, taxTotal: 60, grandTotal: 1250, validUntil: new Date('2026-09-01'), createdById: sales2.id, sentAt: new Date(), acceptedAt: new Date() } });
  await prisma.quotationLineItem.upsert({ where: { id: 'qli2' }, update: {}, create: { id: 'qli2', tenantId: tenant.id, quotationId: q2.id, serviceType: 'VISA', title: 'Dubai Visa', description: '30-day tourist visa x2', quantity: 2, unitPrice: 595, lineTotal: 1190, sortOrder: 1 } });
  console.log('  Quotations: 2 with line items');

  const b1 = await prisma.booking.upsert({ where: { tenantId_bookingRef: { tenantId: tenant.id, bookingRef: 'BKG-2607-1001' } }, update: {}, create: { tenantId: tenant.id, branchId: ho.id, bookingRef: 'BKG-2607-1001', pnrLocator: 'ABC123', status: 'CONFIRMED', clientId: c1.id, quotationId: q1.id, assignedToId: ticketing.id, travelStart: new Date('2026-07-10'), travelEnd: new Date('2026-07-24'), createdById: ticketing.id } });
  await prisma.bookingPassenger.upsert({ where: { id: 'bp1' }, update: {}, create: { id: 'bp1', tenantId: tenant.id, bookingId: b1.id, passengerType: 'ADULT', firstName: 'Rahim', lastName: 'Uddin' } });
  await prisma.bookingStatusLog.upsert({ where: { id: 'bsl1' }, update: {}, create: { id: 'bsl1', tenantId: tenant.id, bookingId: b1.id, toStatus: 'CONFIRMED', note: 'Booking created and confirmed' } });

  const b2 = await prisma.booking.upsert({ where: { tenantId_bookingRef: { tenantId: tenant.id, bookingRef: 'BKG-2607-1002' } }, update: {}, create: { tenantId: tenant.id, branchId: dhk.id, bookingRef: 'BKG-2607-1002', pnrLocator: 'XYZ789', status: 'TICKETED', clientId: c2.id, quotationId: q2.id, assignedToId: ticketing.id, travelStart: new Date('2026-08-05'), travelEnd: new Date('2026-08-12'), createdById: ticketing.id } });
  await prisma.bookingPassenger.upsert({ where: { id: 'bp2a' }, update: {}, create: { id: 'bp2a', tenantId: tenant.id, bookingId: b2.id, passengerType: 'ADULT', firstName: 'Ayesha', lastName: 'Siddique' } });
  await prisma.bookingPassenger.upsert({ where: { id: 'bp2b' }, update: {}, create: { id: 'bp2b', tenantId: tenant.id, bookingId: b2.id, passengerType: 'CHILD', firstName: 'Aariz', lastName: 'Siddique' } });
  await prisma.bookingSegment.upsert({ where: { id: 'bsg1' }, update: {}, create: { id: 'bsg1', tenantId: tenant.id, bookingId: b2.id, segmentType: 'FLIGHT', flightNumber: 'BG347', departureAt: new Date('2026-08-05T10:00:00Z'), arrivalAt: new Date('2026-08-05T16:00:00Z'), status: 'CONFIRMED' } });
  await prisma.bookingStatusLog.upsert({ where: { id: 'bsl2' }, update: {}, create: { id: 'bsl2', tenantId: tenant.id, bookingId: b2.id, toStatus: 'HELD' } });
  await prisma.bookingStatusLog.upsert({ where: { id: 'bsl3' }, update: {}, create: { id: 'bsl3', tenantId: tenant.id, bookingId: b2.id, fromStatus: 'HELD', toStatus: 'CONFIRMED', note: 'Payment received' } });
  await prisma.bookingStatusLog.upsert({ where: { id: 'bsl4' }, update: {}, create: { id: 'bsl4', tenantId: tenant.id, bookingId: b2.id, fromStatus: 'CONFIRMED', toStatus: 'TICKETED', note: 'All tickets issued' } });
  console.log('  Bookings: 2 with passengers/segments');

  const inv1 = await prisma.invoice.upsert({ where: { tenantId_invoiceNumber: { tenantId: tenant.id, invoiceNumber: 'INV-2607-1001' } }, update: {}, create: { tenantId: tenant.id, branchId: ho.id, invoiceNumber: 'INV-2607-1001', status: 'PAID', clientId: c1.id, bookingId: b1.id, currencyCode: 'BDT', subtotal: 333333, taxAmount: 16667, totalAmount: 350000, paidAmount: 350000, dueAmount: 0, createdById: finance.id, issuedAt: new Date() } });
  await prisma.invoiceLine.upsert({ where: { id: 'invl1' }, update: {}, create: { id: 'invl1', tenantId: tenant.id, invoiceId: inv1.id, serviceType: 'UMRAH', description: '14-day Umrah package', quantity: 1, unitPrice: 333333, lineTotal: 333333 } });

  const inv2 = await prisma.invoice.upsert({ where: { tenantId_invoiceNumber: { tenantId: tenant.id, invoiceNumber: 'INV-2607-1002' } }, update: {}, create: { tenantId: tenant.id, branchId: dhk.id, invoiceNumber: 'INV-2607-1002', status: 'PARTIALLY_PAID', clientId: c2.id, bookingId: b2.id, currencyCode: 'USD', subtotal: 1190, taxAmount: 60, totalAmount: 1250, paidAmount: 500, dueAmount: 750, createdById: finance.id, issuedAt: new Date(), dueAt: new Date('2026-08-15') } });
  await prisma.invoiceLine.upsert({ where: { id: 'invl2' }, update: {}, create: { id: 'invl2', tenantId: tenant.id, invoiceId: inv2.id, serviceType: 'VISA', description: 'Dubai tourist visa x2', quantity: 2, unitPrice: 595, lineTotal: 1190 } });
  console.log('  Invoices: 2');

  const pay1 = await prisma.payment.upsert({ where: { id: 'dp1' }, update: {}, create: { id: 'dp1', tenantId: tenant.id, branchId: ho.id, invoiceId: inv1.id, bookingId: b1.id, clientId: c1.id, amount: 350000, currencyCode: 'BDT', paymentMethod: 'BANK_TRANSFER', status: 'RECEIVED', reference: 'BANK-001', createdById: finance.id, receivedAt: new Date() } });
  await prisma.receipt.upsert({
    where: { tenantId_receiptNumber: { tenantId: tenant.id, receiptNumber: 'RCP-2607-1001' } },
    update: { paymentId: pay1.id },
    create: { id: 'dr1', tenantId: tenant.id, receiptNumber: 'RCP-2607-1001', invoiceId: inv1.id, paymentId: pay1.id, paymentMethod: 'BANK_TRANSFER', amount: 350000, currencyCode: 'BDT', receivedAt: new Date() },
  });
  await prisma.ledgerEntry.upsert({ where: { id: 'dle1' }, update: {}, create: { id: 'dle1', tenantId: tenant.id, referenceType: 'PAYMENT', referenceId: pay1.id, direction: 'CREDIT', currencyCode: 'BDT', amount: 350000, description: 'Payment for INV-2607-1001' } });

  const pay2 = await prisma.payment.upsert({ where: { id: 'dp2' }, update: {}, create: { id: 'dp2', tenantId: tenant.id, branchId: dhk.id, invoiceId: inv2.id, bookingId: b2.id, clientId: c2.id, amount: 500, currencyCode: 'USD', paymentMethod: 'CASH', status: 'RECEIVED', createdById: finance.id, receivedAt: new Date() } });
  await prisma.receipt.upsert({
    where: { tenantId_receiptNumber: { tenantId: tenant.id, receiptNumber: 'RCP-2607-1002' } },
    update: { paymentId: pay2.id },
    create: { id: 'dr2', tenantId: tenant.id, receiptNumber: 'RCP-2607-1002', invoiceId: inv2.id, paymentId: pay2.id, paymentMethod: 'CASH', amount: 500, currencyCode: 'USD', receivedAt: new Date() },
  });
  await prisma.ledgerEntry.upsert({ where: { id: 'dle2' }, update: {}, create: { id: 'dle2', tenantId: tenant.id, referenceType: 'PAYMENT', referenceId: pay2.id, direction: 'CREDIT', currencyCode: 'USD', amount: 500, description: 'Payment for INV-2607-1002' } });
  console.log('  Payments: 2 with receipts + ledger');

  await prisma.ticket.upsert({ where: { tenantId_ticketNumber: { tenantId: tenant.id, ticketNumber: 'TKT-2607-1001' } }, update: {}, create: { tenantId: tenant.id, branchId: dhk.id, bookingId: b2.id, ticketNumber: 'TKT-2607-1001', passengerName: 'Ayesha Siddique', status: 'ISSUED', issuedAt: new Date(), createdById: ticketing.id } });
  await prisma.ticket.upsert({ where: { tenantId_ticketNumber: { tenantId: tenant.id, ticketNumber: 'TKT-2607-1002' } }, update: {}, create: { tenantId: tenant.id, branchId: dhk.id, bookingId: b2.id, ticketNumber: 'TKT-2607-1002', passengerName: 'Aariz Siddique', status: 'PENDING', createdById: ticketing.id } });
  console.log('  Tickets: 2');

  const events = [
    { type: 'LEAD_CREATED', subject: 'Lead Ahmed Hassan created', userId: sales1.id },
    { type: 'QUOTATION_CREATED', subject: 'Quotation QTE-2607-1001 created', userId: sales1.id },
    { type: 'BOOKING_CREATED', subject: 'Booking BKG-2607-1001 created', userId: ticketing.id },
    { type: 'INVOICE_CREATED', subject: 'Invoice INV-2607-1001 issued', userId: finance.id },
    { type: 'PAYMENT_RECEIVED', subject: 'Payment 350,000 BDT received', userId: finance.id },
    { type: 'TICKET_ISSUED', subject: 'Ticket TKT-2607-1001 issued', userId: ticketing.id },
  ];
  const EVENT_IDS = ['dea1','dea2','dea3','dea4','dea5','dea6'];
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    await prisma.activity.upsert({
      where: { id: EVENT_IDS[i] },
      update: {},
      create: { id: EVENT_IDS[i], tenantId: tenant.id, branchId: ho.id, userId: e.userId, type: e.type, subject: e.subject },
    });
  }
  console.log('  Activity: 6 timeline events');

  // ─── Accounting foundation (chart of accounts + fiscal year) ───
  const adminUser = users['admin@tripnow.com'];
  const coaAccounts = [
    { code: '1000', name: 'Cash in Hand', type: 'ASSET', balance: 'DEBIT', control: 'CASH' },
    { code: '1010', name: 'Bank Accounts', type: 'ASSET', balance: 'DEBIT', control: 'BANK' },
    { code: '1100', name: 'Accounts Receivable', type: 'ASSET', balance: 'DEBIT', control: 'ACCOUNTS_RECEIVABLE' },
    { code: '2000', name: 'Accounts Payable', type: 'LIABILITY', balance: 'CREDIT', control: 'ACCOUNTS_PAYABLE' },
    { code: '2100', name: 'Tax Payable (VAT)', type: 'LIABILITY', balance: 'CREDIT', control: 'TAX_PAYABLE' },
    { code: '3000', name: 'Share Capital', type: 'EQUITY', balance: 'CREDIT' },
    { code: '3100', name: 'Retained Earnings', type: 'EQUITY', balance: 'CREDIT', control: 'RETAINED_EARNINGS' },
    { code: '4000', name: 'Service Revenue', type: 'REVENUE', balance: 'CREDIT' },
    { code: '5000', name: 'Cost of Services', type: 'COGS', balance: 'DEBIT' },
    { code: '6000', name: 'Salary & Allowances', type: 'EXPENSE', balance: 'DEBIT' },
    { code: '6100', name: 'Office Rent', type: 'EXPENSE', balance: 'DEBIT' },
    { code: '6200', name: 'Utilities & Internet', type: 'EXPENSE', balance: 'DEBIT' },
    { code: '6300', name: 'Marketing & Selling', type: 'EXPENSE', balance: 'DEBIT' },
    { code: '6400', name: 'Bank Charges', type: 'EXPENSE', balance: 'DEBIT' },
    { code: '6500', name: 'Legal & Professional Fees', type: 'EXPENSE', balance: 'DEBIT' },
    { code: '6900', name: 'Depreciation', type: 'EXPENSE', balance: 'DEBIT' },
    { code: '7000', name: 'Other Expense', type: 'OTHER_EXPENSE', balance: 'DEBIT' },
    { code: '4900', name: 'Other Income', type: 'OTHER_INCOME', balance: 'CREDIT' },
  ];
  const COA_IDS = coaAccounts.map((_, i) => `coa${i + 1}`);
  for (let i = 0; i < coaAccounts.length; i++) {
    const a = coaAccounts[i];
    await prisma.gLAccount.upsert({
      where: { tenantId_accountCode: { tenantId: tenant.id, accountCode: a.code } },
      update: {},
      create: { id: COA_IDS[i], tenantId: tenant.id, accountCode: a.code, accountName: a.name, accountType: a.type, normalBalance: a.balance, controlAccountType: a.control, allowManualPosting: !a.control, createdById: adminUser.id },
    });
  }
  console.log('  Chart of accounts: 18 accounts seeded');

  const fy = await prisma.fiscalYear.upsert({
    where: { id: 'fy25' }, update: {},
    create: { id: 'fy25', tenantId: tenant.id, code: 'FY2026', startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31'), createdById: adminUser.id },
  });
  for (let m = 0; m < 12; m++) {
    const start = new Date(2026, m, 1);
    const end = new Date(2026, m + 1, 0, 23, 59, 59, 999);
    await prisma.accountingPeriod.upsert({
      where: { id: `period${m + 1}` },
      update: {},
      create: { id: `period${m + 1}`, tenantId: tenant.id, fiscalYearId: fy.id, periodNumber: m + 1, code: `FY2026-P${String(m + 1).padStart(2, '0')}`, startDate: start, endDate: end },
    });
  }
  console.log('  Fiscal year: FY2026 with 12 monthly periods');

  // ─── Service operations (team + sample case) ───
  await prisma.team.upsert({
    where: { id: 'dteam1' }, update: {},
    create: { id: 'dteam1', tenantId: tenant.id, name: 'Sales & Operations', code: 'SALES_OPS', leaderId: adminUser.id },
  });
  await prisma.teamMember.upsert({
    where: { id: 'dtm1' }, update: {},
    create: { id: 'dtm1', teamId: 'dteam1', userId: adminUser.id, role: 'LEADER' },
  });
  await prisma.teamMember.upsert({
    where: { id: 'dtm2' }, update: {},
    create: { id: 'dtm2', teamId: 'dteam1', userId: sales1.id, role: 'MEMBER' },
  });
  console.log('  Team: Sales & Operations with 2 members');

  const airType = await prisma.serviceType.findUnique({ where: { systemCode: 'AIR_TICKET' } });
  if (airType) {
    const svc = await prisma.serviceCase.upsert({
      where: { id: 'scase1' }, update: {},
      create: { id: 'scase1', tenantId: tenant.id, caseNumber: 'CASE-2026-000001', title: 'Dubai business trip — Rahman family', status: 'IN_PROGRESS', priority: 'MEDIUM', clientId: c1.id, assignedToId: adminUser.id, teamId: 'dteam1', createdById: adminUser.id },
    });
    const airTemplate = await prisma.workflowTemplate.findFirst({ where: { code: 'AIR_TICKET_STANDARD', isSystem: true }, orderBy: { version: 'desc' } });
    let instanceId = null;
    if (airTemplate) {
      const wi = await prisma.workflowInstance.upsert({
        where: { id: 'wi1' }, update: {},
        create: { id: 'wi1', tenantId: tenant.id, templateId: airTemplate.id, templateVersion: airTemplate.version, currentStageCode: 'REQUIREMENTS_COLLECTED', status: 'ACTIVE' },
      });
      instanceId = wi.id;
      await prisma.workflowStageInstance.upsert({
        where: { id: 'wsi1a' }, update: {},
        create: { id: 'wsi1a', tenantId: tenant.id, workflowInstanceId: wi.id, stageCode: 'ENQUIRY_RECEIVED', stageName: 'Enquiry Received', stageGroup: 'INTAKE', sequence: 1, enteredAt: new Date('2026-07-01'), completedAt: new Date('2026-07-01'), slaStatus: 'MET' },
      });
      await prisma.workflowStageInstance.upsert({
        where: { id: 'wsi1b' }, update: {},
        create: { id: 'wsi1b', tenantId: tenant.id, workflowInstanceId: wi.id, stageCode: 'REQUIREMENTS_COLLECTED', stageName: 'Travel Requirements Collected', stageGroup: 'INTAKE', sequence: 2, enteredAt: new Date('2026-07-01'), slaDueAt: new Date('2026-07-01T06:00:00Z'), slaStatus: 'ON_TRACK' },
      });
      await prisma.workflowStatusHistory.upsert({
        where: { id: 'wsh1' }, update: {},
        create: { id: 'wsh1', tenantId: tenant.id, workflowInstanceId: wi.id, toStageCode: 'ENQUIRY_RECEIVED', action: 'START' },
      });
      await prisma.workflowStatusHistory.upsert({
        where: { id: 'wsh2' }, update: {},
        create: { id: 'wsh2', tenantId: tenant.id, workflowInstanceId: wi.id, fromStageCode: 'ENQUIRY_RECEIVED', toStageCode: 'REQUIREMENTS_COLLECTED', action: 'TRANSITION' },
      });
    }
    await prisma.serviceCaseItem.upsert({
      where: { id: 'sci1' }, update: {},
      create: { id: 'sci1', tenantId: tenant.id, serviceCaseId: svc.id, serviceTypeId: airType.id, referenceNumber: 'AIR_TICKET-2026-000001', workflowInstanceId: instanceId, currentStageCode: 'REQUIREMENTS_COLLECTED', status: 'ACTIVE', serviceAmount: 2400, supplierCost: 2000, grossProfit: 400, currencyCode: 'USD', slaDueAt: new Date('2026-07-01T06:00:00Z'), slaStatus: 'ON_TRACK', createdById: adminUser.id },
    });
    console.log('  Service case: 1 with Air Ticket workflow started');
  }

  console.log('\nDemo tenant created successfully!');
  console.log('================================');
  console.log('Tenant: Tripnow Limited (tripnow-limited)');
  console.log('Branches: Head Office (HO), Dhaka Office (DHK)');
  console.log('Departments: 7');
  console.log('Users: 7 staff members');
  console.log('Roles: 7 roles');
  console.log('Leads: 6');
  console.log('Clients: 2');
  console.log('Quotations: 2');
  console.log('Bookings: 2');
  console.log('Invoices: 2');
  console.log('Payments: 2 with receipts + ledger');
  console.log('Tickets: 2');
  console.log('');
  console.log('Login Credentials:');
  console.log('  Admin:     admin@tripnow.com / Demo@123');
  console.log('  Sales:     sales1@tripnow.com / Demo@123');
  console.log('  Ticketing: ticketing@tripnow.com / Demo@123');
  console.log('  Finance:   finance@tripnow.com / Demo@123');
  console.log('  HR:        hr@tripnow.com / Demo@123');
  console.log('  Super Admin: admin@travelo.com / Admin@123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
