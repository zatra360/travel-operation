/**
 * Global Travels Ltd — Complete Company Seed
 * A realistic Bangladeshi travel agency running from 2019 to present.
 * Multiple branches, teams, fiscal years, full operational history.
 *
 * Run: node prisma/seed-company.cjs
 * Login: admin@globaltravels.com / Demo@123
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n========================================');
  console.log('  Global Travels Ltd — Company Seed');
  console.log('========================================\n');

  // ─── TENANT ─────────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'global-travels' },
    update: {},
    create: {
      name: 'Global Travels Ltd',
      slug: 'global-travels',
      status: 'ACTIVE',
      settings: { defaultCurrency: 'BDT', timezone: 'Asia/Dhaka' },
    },
  });
  console.log(`Tenant: ${tenant.name}`);

  // ─── USERS ─────────────────────────────────────────────────
  const userData = [
    { email: 'admin@globaltravels.com', first: 'Rashed', last: 'Chowdhury', role: 'OWNER' },
    { email: 'sales@globaltravels.com', first: 'Nasrin', last: 'Akter', role: 'ADMIN' },
    { email: 'visa@globaltravels.com', first: 'Fahim', last: 'Hasan', role: 'MEMBER' },
    { email: 'ticketing@globaltravels.com', first: 'Sumaiya', last: 'Rahman', role: 'MEMBER' },
    { email: 'tours@globaltravels.com', first: 'Imran', last: 'Hossain', role: 'MEMBER' },
    { email: 'accounts@globaltravels.com', first: 'Maliha', last: 'Islam', role: 'MEMBER' },
    { email: 'ctg@globaltravels.com', first: 'Kamal', last: 'Uddin', role: 'MEMBER' },
    { email: 'cox@globaltravels.com', first: 'Rokeya', last: 'Begum', role: 'MEMBER' },
  ];
  const users = {};
  for (const u of userData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { email: u.email, passwordHash: '$2b$10$demo', firstName: u.first, lastName: u.last },
    });
    users[u.email] = user;
    await prisma.userTenantMembership.upsert({
      where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } },
      update: {},
      create: { userId: user.id, tenantId: tenant.id, role: u.role },
    });
  }
  const admin = users['admin@globaltravels.com'];
  const sales = users['sales@globaltravels.com'];
  const visa = users['visa@globaltravels.com'];
  const ticketing = users['ticketing@globaltravels.com'];
  const tours = users['tours@globaltravels.com'];
  const accounts = users['accounts@globaltravels.com'];
  const ctg = users['ctg@globaltravels.com'];
  const cox = users['cox@globaltravels.com'];
  console.log(`Users: ${userData.length} created`);

  // ─── PERMISSIONS ──────────────────────────────────────────
  const modules = [
    'TENANT','BRANCH','USER','ROLE','PERMISSION','LEAD','CLIENT','FOLLOW_UP',
    'QUOTATION','BOOKING','TICKET','INVOICE','RECEIPT','PAYMENT','EXPENSE','LEDGER',
    'REFUND','REISSUE','CANCELLATION','EMPLOYEE','LEAVE','ATTENDANCE','PERFORMANCE',
    'COMMISSION','SALARY_RUN','DOCUMENT','SETTINGS','AUDIT_LOG','REPORT','DASHBOARD',
    'NOTIFICATION','MASTER_DATA','PROJECT','TASK','VENDOR','INSURANCE','FEEDBACK',
    'JOURNAL','GL_ACCOUNT','ACCOUNTING_PERIOD','SERVICE_TYPE','SERVICE_CASE',
    'SERVICE_ITEM','WORKFLOW','WORKFLOW_TASK','WORKFLOW_APPROVAL','SERVICE_DOCUMENT',
    'SERVICE_REPORT','TEAM',
  ];
  const actions = ['CREATE','READ','UPDATE','DELETE','MANAGE'];
  const permMap = {};
  for (const m of modules) {
    for (const a of actions) {
      const name = `${m}_${a}`;
      const p = await prisma.permission.upsert({ where: { name }, update: {}, create: { name, module: m, action: a, description: `Can ${a.toLowerCase()} ${m.toLowerCase()}` } });
      permMap[name] = p.id;
    }
  }
  console.log(`Permissions: ${Object.keys(permMap).length} ensured`);

  // Grant OWNER all permissions
  const ownerRole = await prisma.role.upsert({ where: { tenantId_name: { tenantId: tenant.id, name: 'Owner' } }, update: {}, create: { tenantId: tenant.id, name: 'Owner', isSystem: true } });
  for (const pid of Object.values(permMap)) {
    await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: ownerRole.id, permissionId: pid } }, update: {}, create: { roleId: ownerRole.id, permissionId: pid } });
  }
  const staffRole = await prisma.role.upsert({ where: { tenantId_name: { tenantId: tenant.id, name: 'Staff' } }, update: {}, create: { tenantId: tenant.id, name: 'Staff', isSystem: true } });
  const staffModules = ['LEAD','CLIENT','QUOTATION','BOOKING','TICKET','INVOICE','RECEIPT','PAYMENT','EXPENSE','DOCUMENT','REPORT','DASHBOARD','NOTIFICATION','SERVICE_TYPE','SERVICE_CASE','SERVICE_ITEM','WORKFLOW','WORKFLOW_TASK','SERVICE_DOCUMENT'];
  for (const m of staffModules) {
    for (const a of ['READ','CREATE','UPDATE']) {
      const pid = permMap[`${m}_${a}`];
      if (pid) await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: staffRole.id, permissionId: pid } }, update: {}, create: { roleId: staffRole.id, permissionId: pid } });
    }
  }
  console.log('Roles: Owner + Staff created');

  // Assign roles
  await prisma.userRoleAssignment.upsert({ where: { id: 'gla1' }, update: {}, create: { id: 'gla1', userId: admin.id, roleId: ownerRole.id, tenantId: tenant.id } });
  for (const email of ['sales@globaltravels.com','visa@globaltravels.com','ticketing@globaltravels.com','tours@globaltravels.com','accounts@globaltravels.com','ctg@globaltravels.com','cox@globaltravels.com']) {
    await prisma.userRoleAssignment.upsert({ where: { id: `gla-${email.split('@')[0]}` }, update: {}, create: { id: `gla-${email.split('@')[0]}`, userId: users[email].id, roleId: staffRole.id, tenantId: tenant.id } });
  }

  // ─── BRANCHES ─────────────────────────────────────────────
  const branches = {};
  for (const [code, name] of [['HO','Head Office, Dhaka'],['CTG','Chittagong Branch'],['SYL','Sylhet Branch'],['CXB','Cox\'s Bazar Branch']]) {
    const b = await prisma.branch.upsert({ where: { id: `gb-${code}` }, update: {}, create: { id: `gb-${code}`, tenantId: tenant.id, name, code, status: 'ACTIVE' } });
    branches[code] = b;
  }
  console.log(`Branches: ${Object.keys(branches).length} created`);

  // ─── TEAMS ────────────────────────────────────────────────
  const teamDefs = [
    { id: 'gt-sales', name: 'Sales & Marketing', code: 'SALES', leader: admin, members: [sales, ctg, cox] },
    { id: 'gt-visa', name: 'Visa Processing', code: 'VISA', leader: visa, members: [sales] },
    { id: 'gt-ticketing', name: 'Ticketing & Reservations', code: 'TKT', leader: ticketing, members: [sales, tours] },
    { id: 'gt-tours', name: 'Tours & Holidays', code: 'TOURS', leader: tours, members: [sales, visa] },
    { id: 'gt-accounts', name: 'Accounts & Finance', code: 'ACCTS', leader: accounts, members: [admin] },
  ];
  const teams = {};
  for (const t of teamDefs) {
    const team = await prisma.team.upsert({ where: { id: t.id }, update: {}, create: { id: t.id, tenantId: tenant.id, name: t.name, code: t.code, leaderId: t.leader.id } });
    teams[t.code] = team;
    for (const m of t.members) {
      await prisma.teamMember.upsert({ where: { id: `${t.id}-${m.id}` }, update: {}, create: { id: `${t.id}-${m.id}`, teamId: team.id, userId: m.id, role: 'MEMBER' } });
    }
    await prisma.teamMember.upsert({ where: { id: `${t.id}-leader` }, update: {}, create: { id: `${t.id}-leader`, teamId: team.id, userId: t.leader.id, role: 'LEADER' } });
  }
  console.log('Teams: 5 created with members');

  // ─── EMPLOYEES ────────────────────────────────────────────
  const empDefs = [
    { code: 'EMP-001', uid: admin, pos: 'Managing Director', br: 'HO' },
    { code: 'EMP-002', uid: sales, pos: 'Sr. Sales Manager', br: 'HO' },
    { code: 'EMP-003', uid: visa, pos: 'Visa Operations Head', br: 'HO' },
    { code: 'EMP-004', uid: ticketing, pos: 'Ticketing Manager', br: 'HO' },
    { code: 'EMP-005', uid: tours, pos: 'Tours Manager', br: 'HO' },
    { code: 'EMP-006', uid: accounts, pos: 'Finance Manager', br: 'HO' },
    { code: 'EMP-007', uid: ctg, pos: 'Branch Manager', br: 'CTG' },
    { code: 'EMP-008', uid: cox, pos: 'Branch Manager', br: 'CXB' },
  ];
  for (const e of empDefs) {
    await prisma.employee.upsert({
      where: { id: `ge-${e.code}` },
      update: {},
      create: { id: `ge-${e.code}`, tenantId: tenant.id, branchId: branches[e.br].id, employeeCode: e.code, userId: e.uid.id, firstName: e.uid.firstName, lastName: e.uid.lastName, email: e.uid.email, position: e.pos, status: 'ACTIVE', joinedAt: new Date('2019-01-01') },
    });
  }
  console.log('Employees: 8 created');

  // ─── CURRENCIES ───────────────────────────────────────────
  const currencyDefs = [
    { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', rate: 110, decimals: 2, isDefault: true },
    { code: 'USD', name: 'US Dollar', symbol: '$', rate: 1, decimals: 2 },
    { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', rate: 3.75, decimals: 2 },
    { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', rate: 3.67, decimals: 2 },
    { code: 'GBP', name: 'British Pound', symbol: '£', rate: 0.79, decimals: 2 },
    { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', rate: 4.70, decimals: 2 },
  ];
  for (const c of currencyDefs) {
    await prisma.currencyConfig.upsert({ where: { id: `gc-${c.code}` }, update: {}, create: { id: `gc-${c.code}`, tenantId: tenant.id, code: c.code, name: c.name, symbol: c.symbol, exchangeRate: c.rate, decimalPlaces: c.decimals, isDefault: c.isDefault || false } });
  }
  console.log(`Currencies: ${currencyDefs.length} configured`);

  // ─── CHART OF ACCOUNTS ────────────────────────────────────
  const coaDefs = [
    ['1000','Cash in Hand','ASSET','DEBIT','CASH'],
    ['1010','Bank Accounts','ASSET','DEBIT','BANK'],
    ['1100','Accounts Receivable','ASSET','DEBIT','ACCOUNTS_RECEIVABLE'],
    ['1200','Advances & Deposits','ASSET','DEBIT'],
    ['1500','Office Equipment','ASSET','DEBIT'],
    ['2000','Accounts Payable','LIABILITY','CREDIT','ACCOUNTS_PAYABLE'],
    ['2100','VAT Payable','LIABILITY','CREDIT','TAX_PAYABLE'],
    ['2200','Income Tax Payable','LIABILITY','CREDIT'],
    ['2300','Payroll Payable','LIABILITY','CREDIT','PAYROLL_PAYABLE'],
    ['3000','Share Capital','EQUITY','CREDIT'],
    ['3100','Retained Earnings','EQUITY','CREDIT','RETAINED_EARNINGS'],
    ['4000','Air Ticket Revenue','REVENUE','CREDIT'],
    ['4100','Visa Processing Revenue','REVENUE','CREDIT'],
    ['4200','Umrah & Hajj Revenue','REVENUE','CREDIT'],
    ['4300','Tour Package Revenue','REVENUE','CREDIT'],
    ['4400','Hotel Booking Revenue','REVENUE','CREDIT'],
    ['4500','Insurance Commission','REVENUE','CREDIT'],
    ['4600','Other Service Revenue','REVENUE','CREDIT'],
    ['5000','Cost of Air Tickets','COGS','DEBIT'],
    ['5100','Cost of Visa Processing','COGS','DEBIT'],
    ['5200','Cost of Umrah & Hajj Packages','COGS','DEBIT'],
    ['5300','Cost of Tour Packages','COGS','DEBIT'],
    ['5400','Cost of Hotel Bookings','COGS','DEBIT'],
    ['6000','Salary & Allowances','EXPENSE','DEBIT'],
    ['6100','Office Rent','EXPENSE','DEBIT'],
    ['6200','Utilities & Internet','EXPENSE','DEBIT'],
    ['6300','Marketing & Advertising','EXPENSE','DEBIT'],
    ['6400','Bank Charges','EXPENSE','DEBIT'],
    ['6500','Legal & Professional Fees','EXPENSE','DEBIT'],
    ['6600','Travel & Conveyance','EXPENSE','DEBIT'],
    ['6700','Printing & Stationery','EXPENSE','DEBIT'],
    ['6900','Depreciation','EXPENSE','DEBIT'],
    ['7000','Other Expense','EXPENSE','DEBIT'],
    ['4900','Other Income','OTHER_INCOME','CREDIT'],
  ];
  const coa = {};
  for (let i = 0; i < coaDefs.length; i++) {
    const [code, name, type, balance, control] = coaDefs[i];
    const a = await prisma.gLAccount.upsert({ where: { id: `gcoa-${code}` }, update: {}, create: { id: `gcoa-${code}`, tenantId: tenant.id, accountCode: code, accountName: name, accountType: type, normalBalance: balance, controlAccountType: control || null, allowManualPosting: !control, createdById: accounts.id } });
    coa[code] = a;
  }
  console.log(`Chart of accounts: ${coaDefs.length} accounts`);

  // ─── FISCAL YEARS 2019–2026 ──────────────────────────────
  const fiscalYears = {};
  for (let y = 2019; y <= 2026; y++) {
    const fy = await prisma.fiscalYear.upsert({
      where: { id: `gfy-${y}` },
      update: {},
      create: { id: `gfy-${y}`, tenantId: tenant.id, code: `FY${y}`, startDate: new Date(`${y}-01-01`), endDate: new Date(`${y}-12-31`), createdById: admin.id, status: y < 2026 ? 'CLOSED' : 'OPEN' },
    });
    fiscalYears[y] = fy;
    for (let m = 0; m < 12; m++) {
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
      const status = y < 2026 ? 'CLOSED' : (y === 2026 && m < 7 ? 'CLOSED' : 'OPEN');
      await prisma.accountingPeriod.upsert({
        where: { id: `gp-${y}-${m + 1}` },
        update: { status },
        create: { id: `gp-${y}-${m + 1}`, tenantId: tenant.id, fiscalYearId: fy.id, periodNumber: m + 1, code: `FY${y}-P${String(m + 1).padStart(2, '0')}`, startDate: start, endDate: end, status },
      });
    }
    if (y < 2026) {
      await prisma.fiscalYear.update({ where: { id: fy.id }, data: { status: 'LOCKED' } });
    }
  }
  console.log('Fiscal years: 2019–2026 with 96 monthly periods');

  // ─── SERVICE TYPES ────────────────────────────────────────
  const systemTypes = [
    ['AIR_TICKET','Air Ticket','plane',true],
    ['VISA','Visa Processing','file-check',true],
    ['HOTEL','Hotel Booking','building',false],
    ['TOUR','Tour Package','map',false],
    ['INSURANCE','Travel Insurance','shield',false],
    ['TRANSFER','Airport Transfer','car',false],
    ['UMRAH','Umrah Package','sun',true],
    ['HAJJ','Hajj Package','star',true],
    ['MEDICAL_TOURISM','Medical Tourism','heart',false],
    ['STUDENT_VISA','Student Visa','graduation-cap',false],
    ['MANPOWER','Manpower / Recruitment','briefcase',false],
    ['CRUISE','Cruise','anchor',false],
  ];
  for (let i = 0; i < systemTypes.length; i++) {
    const [code, name, icon, app] = systemTypes[i];
    await prisma.serviceType.upsert({
      where: { systemCode: code },
      update: {},
      create: { systemCode: code, displayName: name, slug: code.toLowerCase().replace(/_/g,'-'), icon, category: code.includes('HAJJ')||code==='UMRAH'?'PILGRIMAGE':code==='STUDENT_VISA'?'EDUCATION':code==='MEDICAL_TOURISM'||code==='MANPOWER'?'SPECIALIZED':'TRAVEL', displayOrder: i+1, isSystem: true, supportsApplication: app || false, supportsTicketing: code==='AIR_TICKET' },
    });
  }
  console.log('Service types: 12 system types seeded');

  // ─── CLIENTS (2019–2026, growing base) ────────────────────
  const clientNames = [
    ['Rahim Uddin','rahim@email.com','+8801711000001','INDIVIDUAL'],
    ['Ayesha Siddique','ayesha@email.com','+8801711000002','INDIVIDUAL'],
    ['Dhaka Exports Ltd','info@dhakaexports.com','+88028880001','CORPORATE'],
    ['Mohammad Ali','mohammad.ali@email.com','+8801811000003','INDIVIDUAL'],
    ['Fatema Khanam','fatema@email.com','+8801811000004','INDIVIDUAL'],
    ['Sylhet Tea Traders','info@sylhettea.com','+880821700001','CORPORATE'],
    ['Abdul Karim','abdul.karim@email.com','+8801911000005','INDIVIDUAL'],
    ['Chittagong Shipping Ltd','info@ctgship.com','+880312500001','CORPORATE'],
    ['Nusrat Jahan','nusrat@email.com','+8801911000006','INDIVIDUAL'],
    ['Rafiq Islam','rafiq@email.com','+8801511000007','INDIVIDUAL'],
    ['BD Tech Solutions','info@bdtech.com','+880255500001','CORPORATE'],
    ['Shamima Akter','shamima@email.com','+8801511000008','INDIVIDUAL'],
    ['Kamal Hossain','kamal@email.com','+8801311000009','INDIVIDUAL'],
    ['Coxs Bazar Hotels Ltd','info@coxhotels.com','+880341630001','CORPORATE'],
    ['Tahmina Rahman','tahmina@email.com','+8801311000010','INDIVIDUAL'],
    ['Fahim Shahriar','fahim@email.com','+8801611000011','INDIVIDUAL'],
    ['Southeast University','info@seu.edu.bd','+880244490001','CORPORATE'],
    ['Rokeya Sultana','rokeya@email.com','+8801611000012','INDIVIDUAL'],
    ['Hasan Mahmud','hasan@email.com','+8801711000013','INDIVIDUAL'],
    ['Dhaka Medical Centre','info@dmc.com','+880244550001','CORPORATE'],
  ];
  const clients = {};
  for (let i = 0; i < clientNames.length; i++) {
    const [name, email, phone, type] = clientNames[i];
    const c = await prisma.client.upsert({
      where: { id: `gcli-${i + 1}` },
      update: {},
      create: { id: `gcli-${i + 1}`, tenantId: tenant.id, branchId: branches['HO'].id, type, status: 'ACTIVE', displayName: name, email, phone, nationalityLabel: 'Bangladeshi', currencyCode: 'BDT', createdById: sales.id, createdAt: new Date(2019, Math.floor(i / 3), Math.floor(Math.random() * 28) + 1) },
    });
    clients[name] = c;
  }
  console.log(`Clients: ${Object.keys(clients).length} created`);

  // ─── VENDORS ─────────────────────────────────────────────
  const vendorDefs = [
    ['v1','AIRLINE','Emirates','EMIRATES','airline@emirates.com'],
    ['v2','AIRLINE','Biman Bangladesh','BIMAN','biman@biman.gov.bd'],
    ['v3','AIRLINE','Turkish Airlines','TURKISH','turkish@thy.com'],
    ['v4','VISA_PROCESSOR','VFS Global','VFS','info@vfsglobal.com'],
    ['v5','TOUR_OPERATOR','Al-Moktar Travels','ALMOKTAR','info@almoktar.com'],
    ['v6','HOTEL','Makkah Hotel Group','MAKKAH','reservations@makkah.group'],
    ['v7','TRANSPORT','Dhaka Transport Service','DTS','info@dhakatransport.com'],
  ];
  const vendors = {};
  for (const [id, type, name, code, email] of vendorDefs) {
    const v = await prisma.vendor.upsert({ where: { id: `gv-${id}` }, update: {}, create: { id: `gv-${id}`, tenantId: tenant.id, vendorType: type, name, code, contactEmail: email, status: 'ACTIVE', currencyCode: type === 'AIRLINE' ? 'USD' : 'BDT', createdById: admin.id } });
    vendors[code] = v;
  }
  console.log(`Vendors: ${vendorDefs.length} created`);

  // ─── SETTINGS ─────────────────────────────────────────────
  await prisma.tenantSetting.upsert({ where: { tenantId_key: { tenantId: tenant.id, key: 'company' } }, update: {}, create: { tenantId: tenant.id, key: 'company', value: { companyPhone: '+880 2 4105 1000', companyEmail: 'info@globaltravels.com', website: 'https://globaltravels.com', address: '42 Gulshan Avenue, Dhaka 1212' } } });
  await prisma.tenantSetting.upsert({ where: { tenantId_key: { tenantId: tenant.id, key: 'branding' } }, update: {}, create: { tenantId: tenant.id, key: 'branding', value: { themeColor: '#0F766E' } } });
  await prisma.tenantSetting.upsert({ where: { tenantId_key: { tenantId: tenant.id, key: 'notifications' } }, update: {}, create: { tenantId: tenant.id, key: 'notifications', value: { emailNotifications: true } } });
  await prisma.tenantSetting.upsert({ where: { tenantId_key: { tenantId: tenant.id, key: 'security' } }, update: {}, create: { tenantId: tenant.id, key: 'security', value: { passwordMinLength: 8, sessionTimeout: 120 } } });
  console.log('Settings: company info, branding, notifications, security');

  // ─── OPERATIONAL DATA ─────────────────────────────────────
  // We'll create transactions across 2019–2026 that tell a growth story.
  // 2019: small start (~15 transactions), 2020: steady (~25), 2021-2022: big growth (Umrah boom),
  // 2023-2024: mature (~40/yr), 2025-2026: peak (~50/yr)

  const leadNum = (y, n) => `LD-${y}-${String(n).padStart(4, '0')}`;
  const quoteNum = (y, n) => `QTE-${y}-${String(n).padStart(4, '0')}`;
  const invNum = (y, n) => `INV-${y}-${String(n).padStart(4, '0')}`;
  const bkgNum = (y, n) => `BKG-${y}-${String(n).padStart(4, '0')}`;
  const tktNum = (y, n) => `TKT-${y}-${String(n).padStart(4, '0')}`;
  const payNum = (y, n) => `PAY-${y}-${String(n).padStart(4, '0')}`;
  const rcpNum = (y, n) => `RCP-${y}-${String(n).padStart(4, '0')}`;
  const expNum = (y, n) => `EXP-${y}-${String(n).padStart(4, '0')}`;

  const clientList = Object.values(clients);
  const serviceCodes = ['AIR_TICKET','VISA','UMRAH','TOUR','HOTEL','INSURANCE','TRANSFER'];
  const sources = ['WALK_IN','FACEBOOK','REFERRAL','GOOGLE','INSTAGRAM'];

  let totalLeads = 0, totalQuotes = 0, totalBookings = 0, totalTickets = 0, totalInvoices = 0;

  for (let year = 2019; year <= 2026; year++) {
    const txCount = year === 2019 ? 15 : year === 2020 ? 25 : year <= 2022 ? 40 : 50;
    const scale = year >= 2023 ? 1.5 : year >= 2021 ? 1.3 : 1.0;

    // Monthly expenses (consistent across years, scaled)
    const monthlyRent = Math.round(35000 * scale);
    const monthlySalary = Math.round(250000 * scale);
    const monthlyUtility = Math.round(15000 * scale);
    const monthlyMarketing = Math.round(20000 * scale);

    // Create expenses per month
    for (let month = 0; month < 12; month++) {
      const expenseDate = new Date(year, month, 15);
      if (expenseDate > new Date()) continue;

      const expSeq = year * 100 + month * 4;
      await prisma.expense.upsert({
        where: { id: `ge-${year}-${month}-rent` },
        update: {},
        create: { id: `ge-${year}-${month}-rent`, tenantId: tenant.id, branchId: branches['HO'].id, expenseNumber: expNum(year, expSeq + 1), category: 'Office Rent', amount: monthlyRent, currencyCode: 'BDT', status: 'PAID', expenseDate, vendorId: null, description: `Office rent ${new Date(year, month).toLocaleString('default',{month:'long'})} ${year}`, createdById: accounts.id },
      });
      await prisma.expense.upsert({
        where: { id: `ge-${year}-${month}-sal` },
        update: {},
        create: { id: `ge-${year}-${month}-sal`, tenantId: tenant.id, branchId: branches['HO'].id, expenseNumber: expNum(year, expSeq + 2), category: 'Salary & Allowances', amount: monthlySalary, currencyCode: 'BDT', status: 'PAID', expenseDate, vendorId: null, description: `Staff salaries ${new Date(year, month).toLocaleString('default',{month:'long'})} ${year}`, createdById: accounts.id },
      });
      await prisma.expense.upsert({
        where: { id: `ge-${year}-${month}-util` },
        update: {},
        create: { id: `ge-${year}-${month}-util`, tenantId: tenant.id, branchId: branches['HO'].id, expenseNumber: expNum(year, expSeq + 3), category: 'Utilities & Internet', amount: monthlyUtility, currencyCode: 'BDT', status: 'PAID', expenseDate, vendorId: null, description: `Utilities ${new Date(year, month).toLocaleString('default',{month:'long'})} ${year}`, createdById: accounts.id },
      });
      await prisma.expense.upsert({
        where: { id: `ge-${year}-${month}-mkt` },
        update: {},
        create: { id: `ge-${year}-${month}-mkt`, tenantId: tenant.id, branchId: branches['HO'].id, expenseNumber: expNum(year, expSeq + 4), category: 'Marketing & Advertising', amount: monthlyMarketing, currencyCode: 'BDT', status: 'PAID', expenseDate, vendorId: null, description: `Marketing ${new Date(year, month).toLocaleString('default',{month:'long'})} ${year}`, createdById: accounts.id },
      });
    }

    // Create leads → quotes → bookings → invoices → payments for each "deal"
    for (let i = 1; i <= txCount; i++) {
      const client = clientList[(year * 17 + i * 7) % clientList.length];
      const service = serviceCodes[(i + year) % serviceCodes.length];
      const source = sources[(i * 3) % sources.length];
      const day = Math.floor(Math.random() * 28) + 1;
      const month = Math.floor(Math.random() * 12);
      const entryDate = new Date(year, month, day);
      if (entryDate > new Date()) continue;

      const amount = Math.round((5000 + Math.random() * 500000) * scale) / 100;
      const cost = Math.round(amount * (0.7 + Math.random() * 0.15));
      const taxable = ['AIR_TICKET','VISA','HOTEL'].includes(service);
      const tax = taxable ? Math.round(amount * 0.05) : 0;

      // Lead
      const lead = await prisma.lead.upsert({
        where: { id: `gl-${year}-${i}` },
        update: {},
        create: { id: `gl-${year}-${i}`, tenantId: tenant.id, branchId: branches['HO'].id, fullName: `${client.displayName}-${service}`, email: client.email, primaryMobile: client.phone, serviceType: service, source, status: 'WON', priority: amount > 200000 ? 'HIGH' : 'MEDIUM', clientId: client.id, assignedToId: sales.id, createdById: sales.id, createdAt: entryDate, potentialRevenue: amount },
      });
      totalLeads++;

      // Quotation
      const q = await prisma.quotation.upsert({
        where: { id: `gq-${year}-${i}` },
        update: {},
        create: { id: `gq-${year}-${i}`, tenantId: tenant.id, branchId: branches['HO'].id, quoteNumber: quoteNum(year, i), status: 'ACCEPTED', title: `${service.replace(/_/g,' ')} for ${client.displayName}`, clientId: client.id, assignedToId: sales.id, currencyCode: 'BDT', subtotal: amount - tax, taxTotal: tax, grandTotal: amount, createdById: sales.id, sentAt: new Date(entryDate.getTime() + 86400000), acceptedAt: new Date(entryDate.getTime() + 2 * 86400000), createdAt: entryDate },
      });
      await prisma.quotationLineItem.upsert({
        where: { id: `gqli-${year}-${i}` },
        update: {},
        create: { id: `gqli-${year}-${i}`, tenantId: tenant.id, quotationId: q.id, serviceType: service, title: `${service.replace(/_/g,' ')} service`, quantity: 1, unitPrice: amount - tax, taxAmount: tax, lineTotal: amount, sortOrder: 1 },
      });
      totalQuotes++;

      // Invoice
      const inv = await prisma.invoice.upsert({
        where: { id: `gi-${year}-${i}` },
        update: {},
        create: { id: `gi-${year}-${i}`, tenantId: tenant.id, branchId: branches['HO'].id, invoiceNumber: invNum(year, i), status: 'PAID', clientId: client.id, currencyCode: 'BDT', subtotal: amount - tax, taxAmount: tax, totalAmount: amount, paidAmount: amount, dueAmount: 0, createdById: accounts.id, issuedAt: new Date(entryDate.getTime() + 3 * 86400000), createdAt: entryDate },
      });
      await prisma.invoiceLine.upsert({
        where: { id: `gil-${year}-${i}` },
        update: {},
        create: { id: `gil-${year}-${i}`, tenantId: tenant.id, invoiceId: inv.id, serviceType: service, description: `${service.replace(/_/g,' ')} - ${client.displayName}`, quantity: 1, unitPrice: amount - tax, lineTotal: amount - tax },
      });
      totalInvoices++;

      // Payment
      await prisma.payment.upsert({
        where: { id: `gp-${year}-${i}` },
        update: {},
        create: { id: `gp-${year}-${i}`, tenantId: tenant.id, branchId: branches['HO'].id, invoiceId: inv.id, clientId: client.id, amount, currencyCode: 'BDT', paymentMethod: i % 3 === 0 ? 'CASH' : 'BANK_TRANSFER', status: 'RECEIVED', createdById: accounts.id, receivedAt: new Date(entryDate.getTime() + 4 * 86400000) },
      });
      await prisma.receipt.upsert({
        where: { id: `gr-${year}-${i}` },
        update: {},
        create: { id: `gr-${year}-${i}`, tenantId: tenant.id, receiptNumber: rcpNum(year, i), invoiceId: inv.id, paymentId: `gp-${year}-${i}`, paymentMethod: i % 3 === 0 ? 'CASH' : 'BANK_TRANSFER', amount, currencyCode: 'BDT', receivedAt: new Date(entryDate.getTime() + 4 * 86400000) },
      });

      // Booking (only for air ticket and Umrah)
      if (['AIR_TICKET','UMRAH','TOUR'].includes(service)) {
        const b = await prisma.booking.upsert({
          where: { id: `gb-${year}-${i}` },
          update: {},
          create: { id: `gb-${year}-${i}`, tenantId: tenant.id, branchId: branches['HO'].id, bookingRef: bkgNum(year, i), status: 'CONFIRMED', clientId: client.id, quotationId: q.id, createdById: ticketing.id, createdAt: entryDate },
        });
        totalBookings++;
        await prisma.bookingPassenger.upsert({
          where: { id: `gbp-${year}-${i}` },
          update: {},
          create: { id: `gbp-${year}-${i}`, tenantId: tenant.id, bookingId: b.id, passengerType: 'ADULT', firstName: client.displayName.split(' ')[0], lastName: client.displayName.split(' ').slice(1).join(' ') || 'Traveller' },
        });
        if (service === 'AIR_TICKET') {
          const t = await prisma.ticket.upsert({
            where: { id: `gtk-${year}-${i}` },
            update: {},
            create: { id: `gtk-${year}-${i}`, tenantId: tenant.id, bookingId: b.id, ticketNumber: tktNum(year, i), passengerName: client.displayName, status: 'ISSUED', issuedAt: new Date(entryDate.getTime() + 2 * 86400000), createdById: ticketing.id },
          });
          totalTickets++;
        }
      }
    }
  }

  console.log(`\nOperational data:`);
  console.log(`  Leads: ${totalLeads} (2019–2026)`);
  console.log(`  Quotations: ${totalQuotes} with line items`);
  console.log(`  Bookings: ${totalBookings} with passengers`);
  console.log(`  Tickets: ${totalTickets} issued`);
  console.log(`  Invoices: ${totalInvoices} with payments + receipts`);
  console.log(`  Expenses: ~384 monthly (rent, salary, utilities, marketing x 8 years x 12 months)`);

  // ─── BANK ACCOUNTS ────────────────────────────────────────
  await prisma.bankAccount.upsert({ where: { id: 'gba-1' }, update: {}, create: { id: 'gba-1', tenantId: tenant.id, branchId: branches['HO'].id, bankName: 'Dutch-Bangla Bank', accountName: 'Current Account', accountNumber: '102.110.0012345', currencyCode: 'BDT', currentBalance: 8500000, isDefault: true, createdById: accounts.id } });
  await prisma.bankAccount.upsert({ where: { id: 'gba-2' }, update: {}, create: { id: 'gba-2', tenantId: tenant.id, branchId: branches['HO'].id, bankName: 'Standard Chartered', accountName: 'USD Account', accountNumber: '01-5123456-01', currencyCode: 'USD', currentBalance: 45000, createdById: accounts.id } });
  console.log('Bank accounts: 2 created');

  // ─── SERVICE CASE (one active sample) ─────────────────────
  const airType = await prisma.serviceType.findUnique({ where: { systemCode: 'AIR_TICKET' } });
  const sampleClient = clients['Rahim Uddin'];
  if (airType && sampleClient) {
    const sc = await prisma.serviceCase.upsert({
      where: { id: 'gsc-1' },
      update: {},
      create: { id: 'gsc-1', tenantId: tenant.id, branchId: branches['HO'].id, caseNumber: 'CASE-2026-000001', title: 'Dubai business trip — Rahim Uddin', status: 'IN_PROGRESS', priority: 'MEDIUM', clientId: sampleClient.id, assignedToId: sales.id, teamId: teams['SALES'].id, createdById: sales.id, dueAt: new Date('2026-08-15') },
    });

    // Simple generic workflow
    const tmpl = await prisma.workflowTemplate.upsert({
      where: { id: 'gtmpl-generic' },
      update: {},
      create: { id: 'gtmpl-generic', tenantId: tenant.id, serviceTypeId: airType.id, code: 'GENERIC', name: 'Generic', version: 1, status: 'PUBLISHED', isSystem: false, publishedAt: new Date() },
    });
    await prisma.workflowStageTemplate.upsert({ where: { id: 'gwst-start' }, update: {}, create: { id: 'gwst-start', templateId: tmpl.id, code: 'ENQUIRY', name: 'Enquiry', displayOrder: 1, stageGroup: 'INTAKE', isInitial: true } });
    await prisma.workflowStageTemplate.upsert({ where: { id: 'gwst-requirements' }, update: {}, create: { id: 'gwst-requirements', templateId: tmpl.id, code: 'REQUIREMENTS', name: 'Requirements', displayOrder: 2, stageGroup: 'INTAKE', slaHours: 24 } });
    await prisma.workflowStageTemplate.upsert({ where: { id: 'gwst-quote' }, update: {}, create: { id: 'gwst-quote', templateId: tmpl.id, code: 'QUOTATION', name: 'Quotation', displayOrder: 3, stageGroup: 'QUOTATION', slaHours: 48 } });
    await prisma.workflowStageTemplate.upsert({ where: { id: 'gwst-booking' }, update: {}, create: { id: 'gwst-booking', templateId: tmpl.id, code: 'BOOKING', name: 'Booking', displayOrder: 4, stageGroup: 'BOOKING', requiresPayment: true } });
    await prisma.workflowStageTemplate.upsert({ where: { id: 'gwst-done' }, update: {}, create: { id: 'gwst-done', templateId: tmpl.id, code: 'COMPLETED', name: 'Completed', displayOrder: 5, stageGroup: 'CLOSURE', isTerminal: true } });

    const wi = await prisma.workflowInstance.upsert({
      where: { id: 'gwi-1' },
      update: {},
      create: { id: 'gwi-1', tenantId: tenant.id, templateId: tmpl.id, templateVersion: 1, currentStageCode: 'QUOTATION', status: 'ACTIVE' },
    });
    await prisma.workflowStageInstance.upsert({ where: { id: 'gwsi-1a' }, update: {}, create: { id: 'gwsi-1a', tenantId: tenant.id, workflowInstanceId: wi.id, stageCode: 'ENQUIRY', stageName: 'Enquiry', stageGroup: 'INTAKE', sequence: 1, enteredAt: new Date('2026-07-01'), completedAt: new Date('2026-07-01') } });
    await prisma.workflowStageInstance.upsert({ where: { id: 'gwsi-1b' }, update: {}, create: { id: 'gwsi-1b', tenantId: tenant.id, workflowInstanceId: wi.id, stageCode: 'REQUIREMENTS', stageName: 'Requirements', stageGroup: 'INTAKE', sequence: 2, enteredAt: new Date('2026-07-01'), completedAt: new Date('2026-07-02') } });
    await prisma.workflowStageInstance.upsert({ where: { id: 'gwsi-1c' }, update: {}, create: { id: 'gwsi-1c', tenantId: tenant.id, workflowInstanceId: wi.id, stageCode: 'QUOTATION', stageName: 'Quotation', stageGroup: 'QUOTATION', sequence: 3, enteredAt: new Date('2026-07-02'), slaDueAt: new Date('2026-07-04') } });

    await prisma.serviceCaseItem.upsert({
      where: { id: 'gsci-1' },
      update: {},
      create: { id: 'gsci-1', tenantId: tenant.id, serviceCaseId: sc.id, serviceTypeId: airType.id, referenceNumber: 'AIR_TICKET-2026-000001', workflowInstanceId: wi.id, currentStageCode: 'QUOTATION', status: 'ACTIVE', serviceAmount: 85000, supplierCost: 68000, grossProfit: 17000, currencyCode: 'BDT', slaDueAt: new Date('2026-07-04'), slaStatus: 'ON_TRACK', createdById: sales.id },
    });
    console.log('Service case: 1 active with workflow');
  }

  console.log('\n========================================');
  console.log('  Global Travels Ltd — Ready');
  console.log('========================================');
  console.log('\nLogin Credentials:');
  console.log('  Admin:       admin@globaltravels.com / Demo@123');
  console.log('  Sales:       sales@globaltravels.com / Demo@123');
  console.log('  Visa:        visa@globaltravels.com / Demo@123');
  console.log('  Ticketing:   ticketing@globaltravels.com / Demo@123');
  console.log('  Tours:       tours@globaltravels.com / Demo@123');
  console.log('  Accounts:    accounts@globaltravels.com / Demo@123');
  console.log('  Chittagong:  ctg@globaltravels.com / Demo@123');
  console.log('  Cox Bazar:   cox@globaltravels.com / Demo@123');
  console.log('');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
