import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ log: ['error'] });

const AIRCRAFT_TYPES = [
  { iataCode: '32A', name: 'Airbus A320', category: 'Jet' },
  { iataCode: '32N', name: 'Airbus A320neo', category: 'Jet' },
  { iataCode: '321', name: 'Airbus A321', category: 'Jet' },
  { iataCode: '32Q', name: 'Airbus A321neo', category: 'Jet' },
  { iataCode: '319', name: 'Airbus A319', category: 'Jet' },
  { iataCode: '318', name: 'Airbus A318', category: 'Jet' },
  { iataCode: '330', name: 'Airbus A330', category: 'Jet' },
  { iataCode: '333', name: 'Airbus A330-300', category: 'Jet' },
  { iataCode: '33X', name: 'Airbus A330neo', category: 'Jet' },
  { iataCode: '340', name: 'Airbus A340', category: 'Jet' },
  { iataCode: '350', name: 'Airbus A350', category: 'Jet' },
  { iataCode: '359', name: 'Airbus A350-900', category: 'Jet' },
  { iataCode: '351', name: 'Airbus A350-1000', category: 'Jet' },
  { iataCode: '380', name: 'Airbus A380', category: 'Jet' },
  { iataCode: '737', name: 'Boeing 737', category: 'Jet' },
  { iataCode: '73H', name: 'Boeing 737-800', category: 'Jet' },
  { iataCode: '7M8', name: 'Boeing 737 MAX 8', category: 'Jet' },
  { iataCode: '7M9', name: 'Boeing 737 MAX 9', category: 'Jet' },
  { iataCode: '738', name: 'Boeing 737-800 Winglets', category: 'Jet' },
  { iataCode: '739', name: 'Boeing 737-900', category: 'Jet' },
  { iataCode: '744', name: 'Boeing 747-400', category: 'Jet' },
  { iataCode: '748', name: 'Boeing 747-8', category: 'Jet' },
  { iataCode: '757', name: 'Boeing 757', category: 'Jet' },
  { iataCode: '763', name: 'Boeing 767-300', category: 'Jet' },
  { iataCode: '77W', name: 'Boeing 777-300ER', category: 'Jet' },
  { iataCode: '77L', name: 'Boeing 777-200LR', category: 'Jet' },
  { iataCode: '779', name: 'Boeing 777-9', category: 'Jet' },
  { iataCode: '788', name: 'Boeing 787-8', category: 'Jet' },
  { iataCode: '789', name: 'Boeing 787-9', category: 'Jet' },
  { iataCode: '781', name: 'Boeing 787-10', category: 'Jet' },
  { iataCode: 'E70', name: 'Embraer E170', category: 'Regional' },
  { iataCode: 'E75', name: 'Embraer E175', category: 'Regional' },
  { iataCode: 'E90', name: 'Embraer E190', category: 'Regional' },
  { iataCode: 'E95', name: 'Embraer E195', category: 'Regional' },
  { iataCode: 'CRJ', name: 'Canadair Regional Jet', category: 'Regional' },
  { iataCode: 'CR7', name: 'CRJ-700', category: 'Regional' },
  { iataCode: 'CR9', name: 'CRJ-900', category: 'Regional' },
  { iataCode: 'AT7', name: 'ATR 72', category: 'Turboprop' },
  { iataCode: 'AT5', name: 'ATR 42', category: 'Turboprop' },
  { iataCode: 'DH4', name: 'De Havilland Dash 8-400', category: 'Turboprop' },
];

const ALLIANCES = [
  { code: 'STAR_ALLIANCE', name: 'Star Alliance', description: 'World\'s largest global airline alliance', website: 'https://www.staralliance.com' },
  { code: 'SKYTEAM', name: 'SkyTeam', description: 'Global airline alliance founded in 2000', website: 'https://www.skyteam.com' },
  { code: 'ONEWORLD', name: 'Oneworld', description: 'Global airline alliance founded in 1999', website: 'https://www.oneworld.com' },
];

async function main() {
  let c = 0;
  for (const a of AIRCRAFT_TYPES) {
    try { await prisma.aircraftType.create({ data: a }); c++; } catch {}
  }
  console.log(`+${c} aircraft types`);

  let d = 0;
  for (const al of ALLIANCES) {
    try { await prisma.airlineAlliance.create({ data: al }); d++; } catch {}
  }
  console.log(`+${d} alliances`);

  console.log('Aviation reference data seeded.');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
