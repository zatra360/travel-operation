import { PrismaClient } from '@prisma/client';
import { MISSING_COUNTRIES, MORE_AIRLINES, MORE_AIRPORTS } from './more-reference-data';

const prisma = new PrismaClient({ log: ['error'] });

async function main() {
  const existingCountries = await prisma.country.findMany({ select: { iso2: true } });
  const existingIso2 = new Set(existingCountries.map(c => c.iso2));
  let newC = 0;
  for (const c of MISSING_COUNTRIES) {
    if (existingIso2.has(c.iso2)) continue;
    try { await prisma.country.create({ data: c }); newC++; } catch {}
  }
  console.log(`+${newC} countries → ${await prisma.country.count()} total`);

  const countryMap = new Map<string, string>();
  (await prisma.country.findMany({ select: { id: true, iso2: true } })).forEach(c => countryMap.set(c.iso2, c.id));

  const existingAl = new Set((await prisma.airline.findMany({ select: { iataCode: true } })).map(a => a.iataCode));
  let newAl = 0;
  for (const a of MORE_AIRLINES) {
    if (existingAl.has(a.iataCode)) continue;
    try { await prisma.airline.create({ data: { iataCode: a.iataCode, icaoCode: a.icaoCode, name: a.name, countryId: countryMap.get(a.countryIso2) || null } }); newAl++; } catch {}
  }
  console.log(`+${newAl} airlines → ${await prisma.airline.count()} total`);

  const existingAp = new Set((await prisma.airport.findMany({ select: { iataCode: true } })).map(a => a.iataCode));
  let newAp = 0;
  for (const ap of MORE_AIRPORTS) {
    if (existingAp.has(ap.iataCode)) continue;
    const { countryIso2, ...data } = ap as any;
    try { await prisma.airport.create({ data: { ...data, countryId: countryMap.get(countryIso2) || null } }); newAp++; } catch {}
  }
  console.log(`+${newAp} airports → ${await prisma.airport.count()} total`);
  console.log(`\nCurrent: ${await prisma.country.count()} countries, ${await prisma.airline.count()} airlines, ${await prisma.airport.count()} airports, ${await prisma.currency.count()} currencies`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
