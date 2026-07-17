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
      for (const p of perms) {
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
  for (const p of perms) permMap[p.name] = p.id;
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
  for (const l of leads) {
    await prisma.lead.create({ data: { tenantId: tenant.id, branchId: ho.id, assignedToId: l.assignedTo.id, fullName: l.fullName, email: l.email, primaryMobile: l.phone || undefined, companyName: l.companyName || undefined, serviceType: l.serviceType, source: l.source, status: l.status, priority: l.priority, potentialRevenue: l.potentialRevenue, isCorporateLead: l.isCorporateLead || false, numAdults: 1, leadScore: l.priority === 'HIGH' ? 75 : 40, createdById: l.assignedTo.id } });
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
  await prisma.bookingStatusLog.create({ data: { tenantId: tenant.id, bookingId: b1.id, toStatus: 'CONFIRMED', note: 'Booking created and confirmed' } });

  const b2 = await prisma.booking.upsert({ where: { tenantId_bookingRef: { tenantId: tenant.id, bookingRef: 'BKG-2607-1002' } }, update: {}, create: { tenantId: tenant.id, branchId: dhk.id, bookingRef: 'BKG-2607-1002', pnrLocator: 'XYZ789', status: 'TICKETED', clientId: c2.id, quotationId: q2.id, assignedToId: ticketing.id, travelStart: new Date('2026-08-05'), travelEnd: new Date('2026-08-12'), createdById: ticketing.id } });
  await prisma.bookingPassenger.createMany({ data: [{ tenantId: tenant.id, bookingId: b2.id, passengerType: 'ADULT', firstName: 'Ayesha', lastName: 'Siddique' }, { tenantId: tenant.id, bookingId: b2.id, passengerType: 'CHILD', firstName: 'Aariz', lastName: 'Siddique' }] });
  await prisma.bookingSegment.create({ data: { tenantId: tenant.id, bookingId: b2.id, segmentType: 'FLIGHT', flightNumber: 'BG347', departureAt: new Date('2026-08-05T10:00:00Z'), arrivalAt: new Date('2026-08-05T16:00:00Z'), status: 'CONFIRMED' } });
  await prisma.bookingStatusLog.createMany({ data: [{ tenantId: tenant.id, bookingId: b2.id, toStatus: 'HELD' }, { tenantId: tenant.id, bookingId: b2.id, fromStatus: 'HELD', toStatus: 'CONFIRMED', note: 'Payment received' }, { tenantId: tenant.id, bookingId: b2.id, fromStatus: 'CONFIRMED', toStatus: 'TICKETED', note: 'All tickets issued' }] });
  console.log('  Bookings: 2 with passengers/segments');

  const inv1 = await prisma.invoice.upsert({ where: { tenantId_invoiceNumber: { tenantId: tenant.id, invoiceNumber: 'INV-2607-1001' } }, update: {}, create: { tenantId: tenant.id, branchId: ho.id, invoiceNumber: 'INV-2607-1001', status: 'PAID', clientId: c1.id, bookingId: b1.id, currencyCode: 'BDT', subtotal: 333333, taxAmount: 16667, totalAmount: 350000, paidAmount: 350000, dueAmount: 0, createdById: finance.id, issuedAt: new Date() } });
  await prisma.invoiceLine.create({ data: { tenantId: tenant.id, invoiceId: inv1.id, serviceType: 'UMRAH', description: '14-day Umrah package', quantity: 1, unitPrice: 333333, lineTotal: 333333 } });

  const inv2 = await prisma.invoice.upsert({ where: { tenantId_invoiceNumber: { tenantId: tenant.id, invoiceNumber: 'INV-2607-1002' } }, update: {}, create: { tenantId: tenant.id, branchId: dhk.id, invoiceNumber: 'INV-2607-1002', status: 'PARTIALLY_PAID', clientId: c2.id, bookingId: b2.id, currencyCode: 'USD', subtotal: 1190, taxAmount: 60, totalAmount: 1250, paidAmount: 500, dueAmount: 750, createdById: finance.id, issuedAt: new Date(), dueAt: new Date('2026-08-15') } });
  await prisma.invoiceLine.create({ data: { tenantId: tenant.id, invoiceId: inv2.id, serviceType: 'VISA', description: 'Dubai tourist visa x2', quantity: 2, unitPrice: 595, lineTotal: 1190 } });
  console.log('  Invoices: 2');

  const pay1 = await prisma.payment.upsert({ where: { id: 'dp1' }, update: {}, create: { id: 'dp1', tenantId: tenant.id, branchId: ho.id, invoiceId: inv1.id, bookingId: b1.id, clientId: c1.id, amount: 350000, currencyCode: 'BDT', paymentMethod: 'BANK_TRANSFER', status: 'RECEIVED', reference: 'BANK-001', createdById: finance.id, receivedAt: new Date() } });
  await prisma.receipt.create({ data: { tenantId: tenant.id, receiptNumber: 'RCP-2607-1001', invoiceId: inv1.id, paymentId: pay1.id, paymentMethod: 'BANK_TRANSFER', amount: 350000, currencyCode: 'BDT', receivedAt: new Date() } });
  await prisma.ledgerEntry.create({ data: { tenantId: tenant.id, referenceType: 'PAYMENT', referenceId: pay1.id, direction: 'CREDIT', currencyCode: 'BDT', amount: 350000, description: 'Payment for INV-2607-1001' } });

  const pay2 = await prisma.payment.upsert({ where: { id: 'dp2' }, update: {}, create: { id: 'dp2', tenantId: tenant.id, branchId: dhk.id, invoiceId: inv2.id, bookingId: b2.id, clientId: c2.id, amount: 500, currencyCode: 'USD', paymentMethod: 'CASH', status: 'RECEIVED', createdById: finance.id, receivedAt: new Date() } });
  await prisma.receipt.create({ data: { tenantId: tenant.id, receiptNumber: 'RCP-2607-1002', invoiceId: inv2.id, paymentId: pay2.id, paymentMethod: 'CASH', amount: 500, currencyCode: 'USD', receivedAt: new Date() } });
  await prisma.ledgerEntry.create({ data: { tenantId: tenant.id, referenceType: 'PAYMENT', referenceId: pay2.id, direction: 'CREDIT', currencyCode: 'USD', amount: 500, description: 'Payment for INV-2607-1002' } });
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
  for (const e of events) {
    await prisma.activity.create({ data: { tenantId: tenant.id, branchId: ho.id, userId: e.userId, type: e.type, subject: e.subject } });
  }
  console.log('  Activity: 6 timeline events');

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
