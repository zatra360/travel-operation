import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ log: ['error'] });

async function main() {
  const countries = await prisma.country.findMany({ where: { isActive: true }, select: { id: true, name: true, iso2: true, nationalityLabel: true } });
  
  let created = 0;
  let skipped = 0;

  for (const c of countries) {
    const label = c.nationalityLabel || c.name;
    const existing = await prisma.nationality.findFirst({ where: { countryId: c.id, name: label } });
    if (existing) { skipped++; continue; }

    try {
      await prisma.nationality.create({ data: { countryId: c.id, name: label } });
      created++;
    } catch { skipped++; }
  }

  console.log(`Nationalities: +${created} created, ${skipped} skipped, total: ${await prisma.nationality.count()}`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
