import { PrismaClient } from '@prisma/client';
import { MASTER_DATA_SEED } from './master-data-seed';

const prisma = new PrismaClient({ log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'] });

async function main() {
  const existing = await prisma.masterDataCategory.findMany({ where: { deletedAt: null }, select: { code: true } });
  const existingCodes = new Set(existing.map((c) => c.code));

  for (const cat of MASTER_DATA_SEED.categories) {
    if (existingCodes.has(cat.code)) continue;

    const created = await prisma.masterDataCategory.create({ data: cat });
    console.log(`  + category: ${created.code} (${created.name})`);

    const items = MASTER_DATA_SEED.items[cat.code as keyof typeof MASTER_DATA_SEED.items];
    if (items) {
      for (const item of items) {
        await prisma.masterDataItem.create({
          data: { categoryId: created.id, ...item },
        });
      }
      console.log(`    + ${items.length} items`);
    }
    existingCodes.add(cat.code);
  }

  console.log('\nMaster data seed complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
