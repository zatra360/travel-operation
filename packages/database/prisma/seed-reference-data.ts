import { PrismaClient } from '@prisma/client';
import { REFERENCE_DATA_SEED, CABIN_CLASS_SEED } from './reference-data-seed';

const prisma = new PrismaClient({ log: ['error'] });

async function main() {
  const existingCountries = await prisma.country.count();
  if (existingCountries > 0) {
    console.log(`Skipping countries: ${existingCountries} already exist`);
    await prisma.$disconnect();
    return;
  }

  for (const c of REFERENCE_DATA_SEED.countries) {
    await prisma.country.create({ data: c });
  }
  console.log(`Seeded ${REFERENCE_DATA_SEED.countries.length} countries`);

  for (const cur of REFERENCE_DATA_SEED.currencies) {
    try { await prisma.currency.create({ data: cur }); } catch { /* duplicate */ }
  }
  console.log(`Seeded ${REFERENCE_DATA_SEED.currencies.length} currencies`);

  const countryMap = new Map<string, string>();
  const allCountries = await prisma.country.findMany({ select: { id: true, iso2: true } });
  for (const c of allCountries) countryMap.set(c.iso2, c.id);

  for (const al of REFERENCE_DATA_SEED.airlines) {
    const countryId = countryMap.get(al.countryIso2) || null;
    try {
      await prisma.airline.create({
        data: { iataCode: al.iataCode, icaoCode: al.icaoCode, name: al.name, countryId },
      });
    } catch { /* duplicate */ }
  }
  console.log(`Seeded ${REFERENCE_DATA_SEED.airlines.length} airlines`);

  for (const ap of REFERENCE_DATA_SEED.airports) {
    const countryId = countryMap.get(ap.countryIso2) || null;
    try {
      await prisma.airport.create({
        data: {
          iataCode: ap.iataCode, name: ap.name, city: ap.city, countryId,
          timezone: ap.timezone, latitude: ap.latitude, longitude: ap.longitude,
        },
      });
    } catch { /* duplicate */ }
  }
  console.log(`Seeded ${REFERENCE_DATA_SEED.airports.length} airports`);

  for (const cc of CABIN_CLASS_SEED) {
    try { await prisma.cabinClass.create({ data: cc }); } catch { /* duplicate */ }
  }
  console.log(`Seeded ${CABIN_CLASS_SEED.length} cabin classes`);

  console.log('\nReference data seed complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
