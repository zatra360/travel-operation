import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { MASTER_DATA_SEED } from './master-data-seed';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Production safety guard ──────────────────────────────
  // This seed creates a demo tenant and well-known demo accounts with weak,
  // publicly-documented passwords. It must never run against a production
  // database unless an operator explicitly opts in AND supplies a strong
  // super-admin password.
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && process.env.ALLOW_PROD_SEED !== 'true') {
    throw new Error(
      'Refusing to run the demo seed in production. It creates demo tenants and demo ' +
        'accounts with known passwords. Set ALLOW_PROD_SEED=true only if you understand the risk.',
    );
  }
  if (isProduction && !process.env.SUPER_ADMIN_PASSWORD) {
    throw new Error('SUPER_ADMIN_PASSWORD must be set when seeding in production.');
  }

  // ─── Platform Super Admin ─────────────────────────────────
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@travelo.com';
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'Admin@123';

  const superAdmin = await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: {},
    create: {
      email: superAdminEmail,
      passwordHash: await bcrypt.hash(superAdminPassword, 12),
      firstName: 'Super',
      lastName: 'Admin',
      isPlatformSuperAdmin: true,
      status: 'ACTIVE',
    },
  });

  console.log(`  ✓ Super admin: ${superAdmin.email}`);

  // ─── Permissions ──────────────────────────────────────────
  const modules = [
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
  const actions = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE'] as const;

  const permissionMap = new Map<string, string>();

  for (const module of modules) {
    for (const action of actions) {
      const name = `${module}_${action}`;
      const permission = await prisma.permission.upsert({
        where: { name },
        update: {},
        create: {
          name,
          module,
          action,
          description: `Can ${action.toLowerCase()} ${module.toLowerCase().replace(/_/g, ' ')}`,
        },
      });
      permissionMap.set(name, permission.id);
    }
  }

  console.log(`  ✓ ${modules.length * actions.length} permissions created`);

  // ─── Subscription Packages ─────────────────────────────
  const freePackage = await prisma.package.upsert({
    where: { code: 'STARTER' },
    update: {},
    create: {
      name: 'Starter', code: 'STARTER',
      description: 'For small agencies getting started. Up to 5 users, 1 branch.',
      priceMonthly: 0, priceYearly: 0,
      maxUsers: 5, maxBranches: 1,
      features: ['leads', 'clients', 'quotations', 'invoices', 'bookings', 'tickets'],
      sortOrder: 0,
    },
  });
  await prisma.package.upsert({
    where: { code: 'PRO' },
    update: {},
    create: {
      name: 'Professional', code: 'PRO',
      description: 'For growing agencies. Up to 25 users, 5 branches.',
      priceMonthly: 49, priceYearly: 490,
      maxUsers: 25, maxBranches: 5,
      features: ['all_modules'],
      sortOrder: 1,
    },
  });
  await prisma.package.upsert({
    where: { code: 'ENTERPRISE' },
    update: {},
    create: {
      name: 'Enterprise', code: 'ENTERPRISE',
      description: 'For large agencies. Unlimited users and branches.',
      priceMonthly: 149, priceYearly: 1490,
      maxUsers: 999, maxBranches: 999,
      features: ['all_modules', 'priority_support', 'white_label', 'api_access'],
      sortOrder: 2,
    },
  });
  console.log('  ✓ 3 subscription packages created');

  // ─── Demo Tenant ──────────────────────────────────────────
  const demoSlug = process.env.DEMO_TENANT_SLUG || 'tripnow-limited';
  let tenant = await prisma.tenant.findUnique({ where: { slug: demoSlug } });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: 'Tripnow Limited',
        slug: demoSlug,
        status: 'ACTIVE',
        trialEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        settings: { defaultCurrency: 'USD', dateFormat: 'DD/MM/YYYY', timezone: 'Asia/Dhaka' },
      },
    });
    console.log(`  ✓ Tenant created: ${tenant.name}`);
  } else {
    console.log(`  ✓ Tenant exists: ${tenant.name}`);
  }

  // Attach the free Starter plan to demo tenant
  await prisma.tenantSubscription.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: { tenantId: tenant.id, packageId: freePackage.id, status: 'ACTIVE', billingCycle: 'MONTHLY' },
  });
  console.log('  ✓ Free plan assigned to tenant');

// ─── Demo Branch ──────────────────────────────────────────
  let branch = await prisma.branch.findFirst({
    where: { tenantId: tenant.id, code: 'DHK' },
  });

  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        tenantId: tenant.id,
        name: 'Dhaka Office',
        code: 'DHK',
        status: 'ACTIVE',
      },
    });
    console.log(`  ✓ Branch created: ${branch.name}`);
  }

  // ─── System Roles ─────────────────────────────────────────
  const roleDefinitions = [
    { name: 'Tenant Owner', isSystem: true },
    { name: 'Tenant Admin', isSystem: true },
    { name: 'Branch Manager', isSystem: true },
    { name: 'Sales Executive', isSystem: true },
    { name: 'Ticketing Officer', isSystem: true },
    { name: 'Visa Officer', isSystem: true },
    { name: 'Finance Officer', isSystem: true },
    { name: 'HR Manager', isSystem: true },
    { name: 'Team Lead', isSystem: true },
    { name: 'Viewer', isSystem: true },
  ];

  const systemPermissions = {
    'Tenant Owner': modules.flatMap((m) => actions.map((a) => `${m}_${a}`)),
    'Tenant Admin': modules.flatMap((m) => actions.map((a) => `${m}_${a}`)),
    'Branch Manager': [
      ...modules.filter((m) => !['TENANT', 'PERMISSION'].includes(m)).flatMap((m) => actions.map((a) => `${m}_${a}`)),
    ],
    'Sales Executive': ['LEAD_READ', 'LEAD_CREATE', 'LEAD_UPDATE', 'CLIENT_READ', 'CLIENT_CREATE', 'CLIENT_UPDATE', 'QUOTATION_READ', 'QUOTATION_CREATE', 'QUOTATION_UPDATE', 'FOLLOW_UP_READ', 'FOLLOW_UP_CREATE', 'FOLLOW_UP_UPDATE', 'DASHBOARD_READ'],
    'Ticketing Officer': ['BOOKING_READ', 'BOOKING_CREATE', 'BOOKING_UPDATE', 'TICKET_READ', 'TICKET_CREATE', 'TICKET_UPDATE', 'PAYMENT_READ', 'PAYMENT_CREATE', 'CLIENT_READ', 'DASHBOARD_READ'],
    'Visa Officer': ['LEAD_READ', 'LEAD_CREATE', 'LEAD_UPDATE', 'CLIENT_READ', 'CLIENT_CREATE', 'CLIENT_UPDATE', 'DOCUMENT_CREATE', 'DOCUMENT_READ', 'FOLLOW_UP_READ', 'FOLLOW_UP_CREATE', 'DASHBOARD_READ'],
    'Finance Officer': ['INVOICE_READ', 'INVOICE_CREATE', 'INVOICE_UPDATE', 'RECEIPT_READ', 'RECEIPT_CREATE', 'PAYMENT_READ', 'PAYMENT_CREATE', 'PAYMENT_UPDATE', 'EXPENSE_READ', 'EXPENSE_CREATE', 'LEDGER_READ', 'LEDGER_CREATE', 'CLIENT_READ', 'REPORT_READ', 'DASHBOARD_READ', 'JOURNAL_CREATE', 'JOURNAL_READ', 'JOURNAL_UPDATE', 'JOURNAL_MANAGE', 'GL_ACCOUNT_READ', 'GL_ACCOUNT_CREATE', 'GL_ACCOUNT_UPDATE', 'ACCOUNTING_PERIOD_READ'],
    'HR Manager': ['EMPLOYEE_READ', 'EMPLOYEE_CREATE', 'EMPLOYEE_UPDATE', 'LEAVE_READ', 'LEAVE_CREATE', 'LEAVE_UPDATE', 'ATTENDANCE_READ', 'ATTENDANCE_CREATE', 'PERFORMANCE_READ', 'PERFORMANCE_CREATE', 'DASHBOARD_READ'],
    'Team Lead': ['LEAD_READ', 'LEAD_CREATE', 'LEAD_UPDATE', 'CLIENT_READ', 'CLIENT_CREATE', 'CLIENT_UPDATE', 'QUOTATION_READ', 'QUOTATION_CREATE', 'FOLLOW_UP_READ', 'FOLLOW_UP_CREATE', 'BOOKING_READ', 'BOOKING_CREATE', 'DASHBOARD_READ', 'REPORT_READ'],
    'Viewer': modules.flatMap((m) => [`${m}_READ`]).filter((p) => permissionMap.has(p)),
  };

  for (const roleDef of roleDefinitions) {
    let role = await prisma.role.findFirst({
      where: { tenantId: tenant.id, name: roleDef.name },
    });

    if (!role) {
      role = await prisma.role.create({
        data: {
          tenantId: tenant.id,
          name: roleDef.name,
          isSystem: roleDef.isSystem,
          description: `${roleDef.name} role with predefined permissions`,
        },
      });
    }

    const perms = systemPermissions[roleDef.name as keyof typeof systemPermissions] || [];
    for (const permName of perms) {
      const permId = permissionMap.get(permName);
      if (permId) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: permId } },
          update: {},
          create: { roleId: role.id, permissionId: permId },
        });
      }
    }

    console.log(`  ✓ Role "${roleDef.name}": ${perms.length} permissions`);
  }

  // ─── Demo Users ───────────────────────────────────────────
  const demoUsers = [
    { email: 'tripnowlimited@gmail.com', firstName: 'Rajib', lastName: 'Debnath', role: 'Tenant Owner' },
  ];

  for (const u of demoUsers) {
    let user = await prisma.user.findUnique({ where: { email: u.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: u.email,
          passwordHash: await bcrypt.hash('Demo@123', 12),
          firstName: u.firstName,
          lastName: u.lastName,
          status: 'ACTIVE',
        },
      });
    }

    await prisma.userTenantMembership.upsert({
      where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } },
      update: { role: u.role === 'Tenant Owner' ? 'OWNER' : u.role === 'Tenant Admin' ? 'ADMIN' : 'MEMBER' },
      create: { userId: user.id, tenantId: tenant.id, role: u.role === 'Tenant Owner' ? 'OWNER' : u.role === 'Tenant Admin' ? 'ADMIN' : 'MEMBER' },
    });

    await prisma.userBranchMembership.upsert({
      where: { userId_branchId: { userId: user.id, branchId: branch.id } },
      update: {},
      create: { userId: user.id, branchId: branch.id, tenantId: tenant.id, isDefault: true },
    });

    const role = await prisma.role.findFirst({
      where: { tenantId: tenant.id, name: u.role },
    });
    if (role) {
      await prisma.userRoleAssignment.upsert({
        where: { userId_roleId_branchId: { userId: user.id, roleId: role.id, branchId: branch.id } },
        update: {},
        create: { userId: user.id, roleId: role.id, tenantId: tenant.id, branchId: branch.id },
      });
    }

    console.log(`  ✓ Demo user: ${u.email} (${u.role})`);
  }

  // ─── Master Data ──────────────────────────────────────────
  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
    { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
    { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
    { code: 'THB', name: 'Thai Baht', symbol: '฿' },
  ];

  for (const c of currencies) {
    await prisma.currency.upsert({
      where: { code: c.code },
      update: {},
      create: c,
    });
  }

  console.log(`  ✓ ${currencies.length} currencies created`);

  const cabinClasses = [
    { code: 'Y', name: 'Economy', sortOrder: 1 },
    { code: 'W', name: 'Premium Economy', sortOrder: 2 },
    { code: 'J', name: 'Business', sortOrder: 3 },
    { code: 'F', name: 'First Class', sortOrder: 4 },
  ];

  for (const cc of cabinClasses) {
    await prisma.cabinClass.upsert({
      where: { code: cc.code },
      update: {},
      create: cc,
    });
  }

  console.log(`  ✓ ${cabinClasses.length} cabin classes created`);

  // ─── Demo Lead ─────────────────────────────────────────
  const existingLead = await prisma.lead.findFirst({
    where: { tenantId: tenant.id, email: 'jahid@example.com' },
  });
  if (!existingLead) {
    await prisma.lead.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        fullName: 'Jahid Hasan',
        firstName: 'Jahid',
        lastName: 'Hasan',
        email: 'jahid@example.com',
        primaryMobile: '+8801712-345678',
        whatsappNumber: '+8801712-345678',
        status: 'QUALIFIED',
        priority: 'HIGH',
        source: 'WEBSITE',
        sourcePlatform: 'Facebook Ads',
        campaignName: 'Umrah-2026-Q3',
        serviceType: 'UMRAH',
        travelCategory: 'INTERNATIONAL',
        isDomestic: false,
        tripType: 'ROUND_TRIP',
        departureCity: 'Dhaka',
        destinationCity: 'Jeddah',
        numAdults: 2,
        numChildren: 0,
        numInfants: 0,
        preferredTravelDate: new Date('2026-09-15'),
        leadScore: 85,
        conversionProbability: 70,
        potentialRevenue: 250000,
        urgencyLevel: 'HIGH',
        currencyCode: 'BDT',
        leadTemperature: 'HOT',
        assignedToId: superAdmin.id,
      },
    });
    console.log('  ✓ Demo lead: Jahid Hasan (Umrah inquiry)');
  }

  // ─── Demo Client ────────────────────────────────────────
  const existingClient = await prisma.client.findFirst({
    where: { tenantId: tenant.id, email: 'rahim@example.com' },
  });
  if (!existingClient) {
    await prisma.client.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        type: 'PERSON',
        status: 'ACTIVE',
        isVip: true,
        displayName: 'Abdur Rahim',
        email: 'rahim@example.com',
        phone: '+8801812-345678',
        whatsapp: '+8801812-345678',
        nationalityLabel: 'Bangladeshi',
        preferredCommunication: 'WHATSAPP',
        preferredPaymentMethod: 'BANK_TRANSFER',
        loyaltyStatus: 'PREMIUM',
        riskScore: 10,
        currencyCode: 'BDT',
        leadSource: 'REFERRAL',
        phoneVerified: true,
        emailVerified: true,
      },
    });
    console.log('  ✓ Demo client: Abdur Rahim (VIP)');
  }

  // ─── Demo Booking / Invoice / Payment ─────────────────────
  const demoClient = await prisma.client.findFirst({ where: { tenantId: tenant.id, email: 'rahim@example.com' } });
  const ownerUser = await prisma.user.findFirst({ where: { email: 'tripnowlimited@gmail.com' } });

  if (demoClient && ownerUser) {
    const existingBooking = await prisma.booking.findFirst({ where: { tenantId: tenant.id, bookingRef: 'BKG-DEMO-001' } });
    if (!existingBooking) {
      const booking = await prisma.booking.create({
        data: {
          tenantId: tenant.id, branchId: branch.id,
          bookingRef: 'BKG-DEMO-001', status: 'CONFIRMED',
          clientId: demoClient.id, assignedToId: ownerUser.id,
          travelStart: new Date('2026-08-15'), travelEnd: new Date('2026-08-30'),
          notes: 'Demo booking for dashboard',
        },
      });
      await prisma.bookingStatusLog.create({
        data: { tenantId: tenant.id, bookingId: booking.id, toStatus: 'CONFIRMED', note: 'Booking confirmed' },
      });

      const invoice = await prisma.invoice.create({
        data: {
          tenantId: tenant.id, branchId: branch.id,
          invoiceNumber: 'INV-DEMO-001', clientId: demoClient.id,
          bookingId: booking.id, subtotal: 4500, taxAmount: 450,
          totalAmount: 4950, paidAmount: 3000, dueAmount: 1950,
          currencyCode: 'USD', status: 'PARTIALLY_PAID',
          issuedAt: new Date(), dueAt: new Date('2026-08-10'),
        },
      });
      await prisma.invoiceLine.create({
        data: { tenantId: tenant.id, invoiceId: invoice.id, serviceType: 'FLIGHT', description: 'Round-trip Dhaka-Dubai (Economy)', quantity: 1, unitPrice: 3200, lineTotal: 3200 },
      });
      await prisma.invoiceLine.create({
        data: { tenantId: tenant.id, invoiceId: invoice.id, serviceType: 'VISA', description: 'UAE Tourist Visa Processing', quantity: 1, unitPrice: 1300, lineTotal: 1300 },
      });

      await prisma.payment.create({
        data: {
          tenantId: tenant.id, branchId: branch.id,
          invoiceId: invoice.id, bookingId: booking.id,
          clientId: demoClient.id, amount: 3000, currencyCode: 'USD',
          paymentMethod: 'BANK_TRANSFER', status: 'RECEIVED',
          reference: 'TXN-DEMO-001', receivedAt: new Date(),
        },
      });
      console.log('  ✓ Demo booking + invoice + payment created');
    }
  }

  console.log('');
  console.log('✅ Seed completed successfully!');
  console.log('');
  console.log('   Super Admin: admin@travelo.com / Admin@123');
  console.log('   Tenant Owner: tripnowlimited@gmail.com / Demo@123');

  // ─── Platform Master Data ────────────────────────────────
  let catCount = 0; let itemCount = 0;
  for (const cat of MASTER_DATA_SEED.categories) {
    const category = await prisma.masterDataCategory.upsert({
      where: { code: cat.code }, update: {}, create: cat,
    }); catCount++;
    const items = (MASTER_DATA_SEED.items as any)[cat.code] || [];
    for (const item of items) {
      await prisma.masterDataItem.upsert({
        where: { categoryId_code: { categoryId: category.id, code: item.code } },
        update: {},
        create: { ...item, categoryId: category.id },
      }); itemCount++;
    }
  }
  console.log(`  ✓ ${catCount} master data categories, ${itemCount} items seeded`);

  // ─── Demo Vendors ─────────────────────────────────────────
  const demoVendors = [
    { vendorType: 'AIRLINE', name: 'Emirates', code: 'EMIRATES', contactEmail: 'sales@emirates.com', country: 'UAE', commissionPct: 5 },
    { vendorType: 'AIRLINE', name: 'Turkish Airlines', code: 'TURKISH', contactEmail: 'sales@thy.com', country: 'Turkey', commissionPct: 7 },
    { vendorType: 'AIRLINE', name: 'Qatar Airways', code: 'QATAR', contactEmail: 'sales@qr.com', country: 'Qatar', commissionPct: 5 },
    { vendorType: 'HOTEL', name: 'Marriott International', code: 'MARRIOTT', contactEmail: 'groups@marriott.com', country: 'USA', commissionPct: 10 },
    { vendorType: 'HOTEL', name: 'Accor Hotels', code: 'ACCOR', contactEmail: 'b2b@accor.com', country: 'France', commissionPct: 12 },
    { vendorType: 'VISA_PROCESSOR', name: 'VFS Global', code: 'VFS', contactEmail: 'agents@vfsglobal.com', country: 'UAE', commissionPct: 15 },
    { vendorType: 'TOUR_OPERATOR', name: 'TUI Group', code: 'TUI', contactEmail: 'trade@tui.com', country: 'Germany', commissionPct: 8 },
    { vendorType: 'INSURANCE', name: 'Allianz Travel', code: 'ALLIANZ', contactEmail: 'travel@allianz.com', country: 'Germany', commissionPct: 20 },
    { vendorType: 'TRANSPORT', name: 'Careem/Uber for Business', code: 'CAREEM', contactEmail: 'business@careem.com', country: 'UAE' },
    { vendorType: 'GDS', name: 'Amadeus', code: 'AMADEUS', contactEmail: 'support@amadeus.com', country: 'Spain', gdsProvider: 'AMADEUS' },
  ];
  for (const v of demoVendors) {
    await prisma.vendor.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: v.code } },
      update: {},
      create: { tenantId: tenant.id, ...v },
    });
  }
  console.log(`  ✓ ${demoVendors.length} vendors seeded`);

  // ─── Demo Insurance ──────────────────────────────────────
  const emiratesVendor = await prisma.vendor.findFirst({ where: { tenantId: tenant.id, code: 'EMIRATES' } });
  const allianzVendor = await prisma.vendor.findFirst({ where: { tenantId: tenant.id, code: 'ALLIANZ' } });
  await prisma.insurance.upsert({
    where: { tenantId_policyNumber: { tenantId: tenant.id, policyNumber: 'INS-2026-001' } },
    update: {},
    create: {
      tenantId: tenant.id, policyNumber: 'INS-2026-001', providerId: allianzVendor?.id,
      insuranceType: 'TRAVEL', premium: 150, currencyCode: 'USD', sumInsured: 50000,
      coverage: 'Trip cancellation, medical expenses, baggage loss',
      startDate: new Date('2026-07-01'), endDate: new Date('2026-12-31'),
      status: 'ACTIVE',
    },
  });
  await prisma.insurance.upsert({
    where: { tenantId_policyNumber: { tenantId: tenant.id, policyNumber: 'INS-2026-002' } },
    update: {},
    create: {
      tenantId: tenant.id, policyNumber: 'INS-2026-002', providerId: allianzVendor?.id,
      insuranceType: 'MEDICAL', premium: 89, currencyCode: 'USD', sumInsured: 100000,
      coverage: 'Emergency medical coverage worldwide',
      startDate: new Date('2026-06-15'), endDate: new Date('2027-06-14'),
      status: 'ACTIVE',
    },
  });
  console.log('  ✓ 2 demo insurance policies seeded');

  // ─── Demo Feedback ──────────────────────────────────────
  await prisma.feedback.upsert({
    where: { id: 'feedback-demo-1' },
    update: {},
    create: {
      id: 'feedback-demo-1', tenantId: tenant.id,
      rating: 5, npsScore: 10, category: 'SERVICE',
      comment: 'Excellent service! Very professional team.',
      isPublic: true,
    },
  });
  await prisma.feedback.upsert({
    where: { id: 'feedback-demo-2' },
    update: {},
    create: {
      id: 'feedback-demo-2', tenantId: tenant.id,
      rating: 4, npsScore: 8, category: 'TICKETING',
      comment: 'Quick ticket issuance, good prices.',
      isPublic: true,
    },
  });
  await prisma.feedback.upsert({
    where: { id: 'feedback-demo-3' },
    update: {},
    create: {
      id: 'feedback-demo-3', tenantId: tenant.id,
      rating: 3, npsScore: 6, category: 'BOOKING',
      comment: 'Booking process was okay but took longer than expected.',
    },
  });
  console.log('  ✓ 3 demo feedback entries seeded');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
