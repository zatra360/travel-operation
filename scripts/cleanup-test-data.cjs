const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const keep = ['tripnow-limited', 'travelo-platform'];
  const testTenants = await p.tenant.findMany({
    where: { NOT: { slug: { in: keep } } },
    select: { id: true, name: true, slug: true }
  });
  console.log(`Found ${testTenants.length} test tenants to clean up`);
  for (const t of testTenants) console.log(`  - ${t.name} (${t.slug})`);
  if (testTenants.length === 0) { console.log('Nothing to clean.'); await p.$disconnect(); return; }

  const ids = testTenants.map(t => t.id);
  let deleted = 0;
  for (const id of ids) { try { await p.tenant.delete({ where: { id } }); deleted++; } catch {} }
  console.log(`Deleted ${deleted} tenants (cascaded)`);

  // Tables without FK cascade on tenantId
  for (const table of ['FiscalYear','AccountingPeriod','PeriodCloseLog','GLAccount','JournalEntry','JournalItem','JournalEntryLink','DocumentNumberCounter','DocumentNumberHistory','IdempotencyRecord','GLExchangeRate','SystemAuditLog','FinancialRiskAlert','FollowUp','WorkflowTask']) {
    for (const id of ids) { try { await p.$executeRawUnsafe(`DELETE FROM "${table}" WHERE "tenantId" = '${id}'`); } catch {} }
  }

  const demoUsers = await p.user.findMany({ where: { email: { contains: '@tripnow.com' } }, select: { email: true } });
  const platformAdmin = await p.user.findMany({ where: { email: 'admin@travelo.com' }, select: { email: true } });
  const keepEmails = [...demoUsers.map(u => u.email), ...platformAdmin.map(u => u.email)];
  const testUsers = await p.user.findMany({ where: { NOT: { email: { in: keepEmails } } }, select: { id: true } });
  for (const u of testUsers) { try { await p.user.delete({ where: { id: u.id } }); } catch {} }
  console.log(`Cleaned ${testUsers.length} test users`);

  try { await p.$executeRawUnsafe(`DELETE FROM "ServiceType" WHERE "isSystem" = false`); } catch {}
  console.log('Done.');
  await p.$disconnect();
})();