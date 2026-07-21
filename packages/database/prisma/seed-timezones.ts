import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({ log: ['error'] });

const TIMEZONES = [
  { code: 'Asia/Dubai', name: 'Gulf Standard Time', city: 'Dubai', iataCode: 'DXB', countryCode: 'AE', utcOffset: '+04:00' },
  { code: 'Europe/London', name: 'Greenwich Mean Time', city: 'London', iataCode: 'LHR', countryCode: 'GB', utcOffset: '+00:00' },
  { code: 'America/New_York', name: 'Eastern Time', city: 'New York', iataCode: 'JFK', countryCode: 'US', utcOffset: '-05:00' },
  { code: 'America/Los_Angeles', name: 'Pacific Time', city: 'Los Angeles', iataCode: 'LAX', countryCode: 'US', utcOffset: '-08:00' },
  { code: 'America/Chicago', name: 'Central Time', city: 'Chicago', iataCode: 'ORD', countryCode: 'US', utcOffset: '-06:00' },
  { code: 'America/Denver', name: 'Mountain Time', city: 'Denver', iataCode: 'DEN', countryCode: 'US', utcOffset: '-07:00' },
  { code: 'Europe/Istanbul', name: 'Turkey Time', city: 'Istanbul', iataCode: 'IST', countryCode: 'TR', utcOffset: '+03:00' },
  { code: 'Asia/Dhaka', name: 'Bangladesh Standard Time', city: 'Dhaka', iataCode: 'DAC', countryCode: 'BD', utcOffset: '+06:00' },
  { code: 'Asia/Kolkata', name: 'India Standard Time', city: 'Delhi', iataCode: 'DEL', countryCode: 'IN', utcOffset: '+05:30' },
  { code: 'Asia/Kuala_Lumpur', name: 'Malaysia Time', city: 'Kuala Lumpur', iataCode: 'KUL', countryCode: 'MY', utcOffset: '+08:00' },
  { code: 'Asia/Singapore', name: 'Singapore Time', city: 'Singapore', iataCode: 'SIN', countryCode: 'SG', utcOffset: '+08:00' },
  { code: 'Asia/Bangkok', name: 'Indochina Time', city: 'Bangkok', iataCode: 'BKK', countryCode: 'TH', utcOffset: '+07:00' },
  { code: 'Asia/Riyadh', name: 'Arabia Standard Time', city: 'Jeddah', iataCode: 'JED', countryCode: 'SA', utcOffset: '+03:00' },
  { code: 'Africa/Cairo', name: 'Eastern European Time', city: 'Cairo', iataCode: 'CAI', countryCode: 'EG', utcOffset: '+02:00' },
  { code: 'Asia/Tokyo', name: 'Japan Standard Time', city: 'Tokyo', iataCode: 'NRT', countryCode: 'JP', utcOffset: '+09:00' },
  { code: 'Australia/Sydney', name: 'Australian Eastern Time', city: 'Sydney', iataCode: 'SYD', countryCode: 'AU', utcOffset: '+10:00' },
  { code: 'Europe/Paris', name: 'Central European Time', city: 'Paris', iataCode: 'CDG', countryCode: 'FR', utcOffset: '+01:00' },
  { code: 'Europe/Berlin', name: 'Central European Time', city: 'Frankfurt', iataCode: 'FRA', countryCode: 'DE', utcOffset: '+01:00' },
  { code: 'Europe/Amsterdam', name: 'Central European Time', city: 'Amsterdam', iataCode: 'AMS', countryCode: 'NL', utcOffset: '+01:00' },
  { code: 'America/Toronto', name: 'Eastern Time', city: 'Toronto', iataCode: 'YYZ', countryCode: 'CA', utcOffset: '-05:00' },
  { code: 'America/Sao_Paulo', name: 'Brasilia Time', city: 'Sao Paulo', iataCode: 'GRU', countryCode: 'BR', utcOffset: '-03:00' },
  { code: 'Africa/Johannesburg', name: 'South Africa Standard Time', city: 'Cape Town', iataCode: 'CPT', countryCode: 'ZA', utcOffset: '+02:00' },
  { code: 'Asia/Karachi', name: 'Pakistan Standard Time', city: 'Karachi', iataCode: 'KHI', countryCode: 'PK', utcOffset: '+05:00' },
  { code: 'Asia/Manila', name: 'Philippine Time', city: 'Manila', iataCode: 'MNL', countryCode: 'PH', utcOffset: '+08:00' },
  { code: 'Asia/Jakarta', name: 'Western Indonesia Time', city: 'Jakarta', iataCode: 'CGK', countryCode: 'ID', utcOffset: '+07:00' },
  { code: 'Asia/Shanghai', name: 'China Standard Time', city: 'Beijing', iataCode: 'PEK', countryCode: 'CN', utcOffset: '+08:00' },
  { code: 'Asia/Seoul', name: 'Korea Standard Time', city: 'Seoul', iataCode: 'ICN', countryCode: 'KR', utcOffset: '+09:00' },
  { code: 'Asia/Hong_Kong', name: 'Hong Kong Time', city: 'Hong Kong', iataCode: 'HKG', countryCode: 'HK', utcOffset: '+08:00' },
  { code: 'Pacific/Auckland', name: 'New Zealand Time', city: 'Auckland', iataCode: 'AKL', countryCode: 'NZ', utcOffset: '+12:00' },
  { code: 'Asia/Colombo', name: 'Sri Lanka Time', city: 'Colombo', iataCode: 'CMB', countryCode: 'LK', utcOffset: '+05:30' },
  { code: 'Asia/Kathmandu', name: 'Nepal Time', city: 'Kathmandu', iataCode: 'KTM', countryCode: 'NP', utcOffset: '+05:45' },
  { code: 'Asia/Muscat', name: 'Gulf Standard Time', city: 'Muscat', iataCode: 'MCT', countryCode: 'OM', utcOffset: '+04:00' },
  { code: 'Asia/Qatar', name: 'Arabia Standard Time', city: 'Doha', iataCode: 'DOH', countryCode: 'QA', utcOffset: '+03:00' },
  { code: 'Asia/Bahrain', name: 'Arabia Standard Time', city: 'Manama', iataCode: 'BAH', countryCode: 'BH', utcOffset: '+03:00' },
  { code: 'Europe/Moscow', name: 'Moscow Standard Time', city: 'Moscow', iataCode: 'SVO', countryCode: 'RU', utcOffset: '+03:00' },
];

async function main() {
  for (const t of TIMEZONES) {
    try { await prisma.timezone.upsert({ where: { code: t.code }, create: t, update: {} }); console.log('+', t.code); } catch (e: any) { console.error('ERR', t.code, e.message); }
  }
  console.log(`Done. Total: ${await prisma.timezone.count()}`);
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
