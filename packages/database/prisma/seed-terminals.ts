import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ log: ['error'] });

const TERMINALS: Record<string, { code: string; name: string }[]> = {
  DXB: [
    { code: 'T1', name: 'Terminal 1' },
    { code: 'T2', name: 'Terminal 2' },
    { code: 'T3', name: 'Terminal 3' },
  ],
  AUH: [
    { code: 'T1', name: 'Terminal 1' },
    { code: 'T2', name: 'Terminal 2' },
    { code: 'T3', name: 'Terminal 3' },
  ],
  DOH: [{ code: 'T1', name: 'Terminal 1' }],
  JED: [
    { code: 'T1', name: 'Terminal 1' },
    { code: 'H', name: 'Hajj Terminal' },
    { code: 'N', name: 'North Terminal' },
  ],
  RUH: [
    { code: 'T1', name: 'Terminal 1' },
    { code: 'T2', name: 'Terminal 2' },
    { code: 'T3', name: 'Terminal 3' },
    { code: 'T4', name: 'Terminal 4' },
    { code: 'T5', name: 'Terminal 5' },
  ],
  MCT: [{ code: 'T1', name: 'Terminal 1' }],
  KWI: [
    { code: 'T1', name: 'Terminal 1' },
    { code: 'T4', name: 'Terminal 4' },
    { code: 'T5', name: 'Terminal 5' },
  ],
  IST: [{ code: 'T1', name: 'Main Terminal' }],
  DAC: [
    { code: 'T1', name: 'Terminal 1' },
    { code: 'T2', name: 'Terminal 2' },
  ],
  DEL: [
    { code: 'T1', name: 'Terminal 1' },
    { code: 'T2', name: 'Terminal 2' },
    { code: 'T3', name: 'Terminal 3' },
  ],
  BOM: [
    { code: 'T1', name: 'Terminal 1' },
    { code: 'T2', name: 'Terminal 2' },
  ],
  SIN: [
    { code: 'T1', name: 'Terminal 1' },
    { code: 'T2', name: 'Terminal 2' },
    { code: 'T3', name: 'Terminal 3' },
    { code: 'T4', name: 'Terminal 4' },
  ],
  BKK: [{ code: 'T1', name: 'Main Terminal' }],
  HKG: [
    { code: 'T1', name: 'Terminal 1' },
    { code: 'T2', name: 'Terminal 2' },
  ],
  KUL: [
    { code: 'T1', name: 'Terminal 1' },
    { code: 'T2', name: 'Terminal 2' },
  ],
  LHR: [
    { code: 'T2', name: 'Terminal 2' },
    { code: 'T3', name: 'Terminal 3' },
    { code: 'T4', name: 'Terminal 4' },
    { code: 'T5', name: 'Terminal 5' },
  ],
  CDG: [
    { code: 'T1', name: 'Terminal 1' },
    { code: 'T2A', name: 'Terminal 2A' },
    { code: 'T2B', name: 'Terminal 2B' },
    { code: 'T2C', name: 'Terminal 2C' },
    { code: 'T2D', name: 'Terminal 2D' },
    { code: 'T2E', name: 'Terminal 2E' },
    { code: 'T2F', name: 'Terminal 2F' },
    { code: 'T3', name: 'Terminal 3' },
  ],
  FRA: [
    { code: 'T1', name: 'Terminal 1' },
    { code: 'T2', name: 'Terminal 2' },
  ],
  AMS: [{ code: 'T1', name: 'Main Terminal' }],
  JFK: [
    { code: 'T1', name: 'Terminal 1' },
    { code: 'T4', name: 'Terminal 4' },
    { code: 'T5', name: 'Terminal 5' },
    { code: 'T7', name: 'Terminal 7' },
    { code: 'T8', name: 'Terminal 8' },
  ],
  LAX: [
    { code: 'T1', name: 'Terminal 1' },
    { code: 'T2', name: 'Terminal 2' },
    { code: 'T3', name: 'Terminal 3' },
    { code: 'T4', name: 'Terminal 4' },
    { code: 'T5', name: 'Terminal 5' },
    { code: 'T6', name: 'Terminal 6' },
    { code: 'T7', name: 'Terminal 7' },
    { code: 'TB', name: 'Tom Bradley International' },
  ],
  NRT: [
    { code: 'T1', name: 'Terminal 1' },
    { code: 'T2', name: 'Terminal 2' },
    { code: 'T3', name: 'Terminal 3' },
  ],
  ICN: [
    { code: 'T1', name: 'Terminal 1' },
    { code: 'T2', name: 'Terminal 2' },
  ],
  SYD: [
    { code: 'T1', name: 'Terminal 1 (International)' },
    { code: 'T2', name: 'Terminal 2 (Domestic)' },
    { code: 'T3', name: 'Terminal 3 (Domestic)' },
  ],
};

async function main() {
  const airports = await prisma.airport.findMany({ select: { id: true, iataCode: true } });
  const airportMap = new Map(airports.map(a => [a.iataCode, a.id]));

  let total = 0;
  for (const [iata, terminals] of Object.entries(TERMINALS)) {
    const airportId = airportMap.get(iata);
    if (!airportId) continue;
    for (const t of terminals) {
      try { await prisma.airportTerminal.create({ data: { airportId, ...t } }); total++; } catch {}
    }
  }
  console.log(`Seeded ${total} airport terminals for ${Object.keys(TERMINALS).length} airports`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
