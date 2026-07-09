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

  console.log('\nDemo tenant created successfully!');
  console.log('================================');
  console.log('Tenant: TripNow Limited (tripnow-limited)');
  console.log('Branches: Head Office (HO), Dhaka Office (DHK)');
  console.log('Departments: 7 created');
  console.log('Users: 7 staff members');
  console.log('Roles: 7 roles');
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
