import { PrismaClient } from '@prisma/client';
import { ALL_COUNTRIES, ALL_AIRLINES, ALL_AIRPORTS, CURRENCIES } from './extended-reference-data';

const prisma = new PrismaClient({ log: ['error'] });

async function main() {
  const existingCountries = await prisma.country.findMany({ select: { iso2: true } });
  const existingIso2 = new Set(existingCountries.map(c => c.iso2));
  let newCountries = 0;
  for (const c of ALL_COUNTRIES) {
    if (existingIso2.has(c.iso2)) continue;
    try { await prisma.country.create({ data: c }); newCountries++; } catch {}
  }
  console.log(`+ ${newCountries} new countries (total: ${await prisma.country.count()})`);

  const existingCurrencies = await prisma.currency.findMany({ select: { code: true } });
  const existingCurrCodes = new Set(existingCurrencies.map(c => c.code));
  let newCurr = 0;
  for (const c of CURRENCIES) {
    if (existingCurrCodes.has(c.code)) continue;
    try { await prisma.currency.create({ data: c }); newCurr++; } catch {}
  }
  console.log(`+ ${newCurr} new currencies (total: ${await prisma.currency.count()})`);

  const countryMap = new Map<string, string>();
  const allCountries = await prisma.country.findMany({ select: { id: true, iso2: true } });
  for (const c of allCountries) countryMap.set(c.iso2, c.id);

  const existingAirlines = await prisma.airline.findMany({ select: { iataCode: true } });
  const existingAirlinesSet = new Set(existingAirlines.map(a => a.iataCode));
  let newAirlines = 0;
  for (const al of ALL_AIRLINES) {
    if (existingAirlinesSet.has(al.iataCode)) continue;
    const countryId = countryMap.get(al.countryIso2) || null;
    try { await prisma.airline.create({ data: { iataCode: al.iataCode, icaoCode: al.icaoCode, name: al.name, countryId } }); newAirlines++; } catch {}
  }
  console.log(`+ ${newAirlines} new airlines (total: ${await prisma.airline.count()})`);

  const existingAirports = await prisma.airport.findMany({ select: { iataCode: true } });
  const existingAirportsSet = new Set(existingAirports.map(a => a.iataCode));
  let newAirports = 0;
  for (const ap of ALL_AIRPORTS) {
    if (existingAirportsSet.has(ap.iataCode)) continue;
    const { countryIso2, ...airportData } = ap as any;
    const countryId = countryMap.get(countryIso2) || null;
    try { await prisma.airport.create({ data: { ...airportData, countryId } }); newAirports++; } catch {}
  }
  console.log(`+ ${newAirports} new airports (total: ${await prisma.airport.count()})`);

  console.log('\nExtended reference data seed complete.');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
