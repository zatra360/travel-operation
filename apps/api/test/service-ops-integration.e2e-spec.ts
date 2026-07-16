import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { ServiceTypeService } from '../src/modules/service-ops/service-type.service';
import { ServiceCaseService } from '../src/modules/service-ops/service-case.service';
import { WorkflowEngineService } from '../src/modules/service-ops/workflow-engine.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { ActivityService } from '../src/modules/activity/activity.service';
import { normalizeServiceTypeCode } from '../src/modules/service-ops/service-type-map';

const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*"?([^"#]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

jest.setTimeout(90000);

const prisma = new PrismaClient();
const audit = new AuditService(prisma as any);
const activity = new ActivityService(prisma as any);
const serviceTypes = new ServiceTypeService(prisma as any, audit);
const engine = new WorkflowEngineService(prisma as any, audit, activity);
const cases = new ServiceCaseService(prisma as any, audit, activity, serviceTypes, engine);

const RUN = `t${Date.now()}`;

let TENANT: string;
let USER: string;

beforeAll(async () => {
  await prisma.$queryRaw`SELECT 1`;
  const tenant = await prisma.tenant.create({ data: { name: `SvcInt ${RUN}`, slug: `svcint-${RUN}` } });
  TENANT = tenant.id;
  const user = await prisma.user.create({
    data: { email: `svcint-${RUN}@test.local`, passwordHash: 'x', firstName: 'Int', lastName: 'Tester' },
  });
  USER = user.id;
  await cases.ensureFoundation();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Service type normalization', () => {
  it('maps legacy aliases to system codes', () => {
    expect(normalizeServiceTypeCode('FLIGHT')).toBe('AIR_TICKET');
    expect(normalizeServiceTypeCode('air-ticket')).toBe('AIR_TICKET');
    expect(normalizeServiceTypeCode('Air Ticket')).toBe('AIR_TICKET');
    expect(normalizeServiceTypeCode('umrah')).toBe('UMRAH');
    expect(normalizeServiceTypeCode('PACKAGE')).toBe('PACKAGE');
    expect(normalizeServiceTypeCode(null)).toBeNull();
  });
});

describe('Lead to case conversion', () => {
  let leadId: string;

  beforeAll(async () => {
    const client = await prisma.client.create({
      data: { tenantId: TENANT, displayName: `Convert Client ${RUN}` },
    });
    const lead = await prisma.lead.create({
      data: {
        tenantId: TENANT,
        fullName: 'Kamal Uddin',
        email: `kamal-${RUN}@test.local`,
        serviceType: 'UMRAH',
        priority: 'HIGH',
        potentialRevenue: 4500,
        clientId: client.id,
        source: 'FACEBOOK',
        departureCity: 'Dhaka',
        numAdults: 2,
      },
    });
    leadId = lead.id;
  });

  it('creates a case from the lead with the normalized service item', async () => {
    const created = await cases.createFromLead(TENANT, USER, undefined, leadId);
    expect(created.leadId).toBe(leadId);
    expect(created.clientId).toBeTruthy();
    expect(created.priority).toBe('HIGH');
    expect(created.items).toHaveLength(1);
    expect(created.items[0].serviceType.systemCode).toBe('UMRAH');
    expect(Number(created.items[0].serviceAmount)).toBe(4500);
    expect((created.items[0].metadata as any).departureCity).toBe('Dhaka');

    const convertActivity = await prisma.activity.findFirst({
      where: { tenantId: TENANT, type: 'LEAD_CONVERTED_TO_CASE', entityId: leadId },
    });
    expect(convertActivity).toBeTruthy();
  });

  it('refuses to convert the same lead twice while its case is open', async () => {
    await expect(cases.createFromLead(TENANT, USER, undefined, leadId)).rejects.toThrow(/LEAD_ALREADY_CONVERTED/);
  });

  it('refuses leads without a recognizable service type', async () => {
    const vague = await prisma.lead.create({
      data: { tenantId: TENANT, fullName: 'No Service', email: `ns-${RUN}@test.local` },
    });
    await expect(cases.createFromLead(TENANT, USER, undefined, vague.id)).rejects.toThrow(/no recognizable service type/);
  });
});

describe('Quotation and booking linkage', () => {
  let caseId: string;
  let itemId: string;
  let quotationId: string;

  beforeAll(async () => {
    const created = await cases.create(TENANT, USER, undefined, {
      title: 'Linkage test',
      items: [{ serviceTypeCode: 'AIR_TICKET', supplierCost: 700 }],
    } as any);
    caseId = created.id;
    itemId = created.items[0].id;

    const airTicketType = await prisma.serviceType.findUnique({ where: { systemCode: 'AIR_TICKET' } });
    const quotation = await prisma.quotation.create({
      data: {
        tenantId: TENANT,
        quoteNumber: `QTE-${RUN}`,
        status: 'ACCEPTED',
        grandTotal: 1450,
        lineItems: {
          create: [
            {
              tenantId: TENANT, serviceType: 'AIR_TICKET', serviceTypeId: airTicketType!.id,
              title: 'DAC-JED return', quantity: 1, unitPrice: 1000, taxAmount: 50, lineTotal: 1050,
            },
            {
              tenantId: TENANT, serviceType: 'HOTEL',
              title: 'Makkah hotel', quantity: 1, unitPrice: 400, lineTotal: 400,
            },
          ],
        },
      },
    });
    quotationId = quotation.id;
  });

  it('links a quotation and syncs financials from matching service lines only', async () => {
    const updated = await cases.linkQuotation(TENANT, USER, itemId, quotationId, true);
    expect(updated.quotationId).toBe(quotationId);
    expect(Number(updated.serviceAmount)).toBe(1050);
    expect(Number(updated.taxAmount)).toBe(50);
    expect(Number(updated.grossProfit)).toBe(350);

    const parent = await cases.findById(TENANT, caseId);
    expect(Number(parent.expectedRevenue)).toBe(1050);
  });

  it('links a booking and captures the TTL from holdExpiresAt', async () => {
    const holdExpiresAt = new Date(Date.now() + 24 * 3600 * 1000);
    const booking = await prisma.booking.create({
      data: { tenantId: TENANT, bookingRef: `BKG-${RUN}`, status: 'HELD', holdExpiresAt },
    });
    const updated = await cases.linkBooking(TENANT, USER, itemId, booking.id);
    expect(updated.bookingId).toBe(booking.id);
    expect((updated.metadata as any).bookingRef).toBe(`BKG-${RUN}`);
    expect((updated.metadata as any).ticketingTimeLimit).toBe(holdExpiresAt.toISOString());
  });

  it('rolls invoices from linked quotations/bookings into the settlement summary', async () => {
    await prisma.invoice.create({
      data: {
        tenantId: TENANT, invoiceNumber: `INV-${RUN}`, status: 'PARTIALLY_PAID',
        quotationId, totalAmount: 1050, paidAmount: 500, dueAmount: 550,
      },
    });
    const summary = await cases.financialSummary(TENANT, caseId);
    expect(summary.settlement.invoiceCount).toBe(1);
    expect(summary.settlement.invoiced).toBe(1050);
    expect(summary.settlement.paid).toBe(500);
    expect(summary.settlement.due).toBe(550);
  });

  it('rejects linking a quotation from another tenant', async () => {
    const foreignTenant = await prisma.tenant.create({ data: { name: `SvcInt F ${RUN}`, slug: `svcint-f-${RUN}` } });
    const foreignQuote = await prisma.quotation.create({
      data: { tenantId: foreignTenant.id, quoteNumber: `QTE-F-${RUN}`, status: 'DRAFT' },
    });
    await expect(cases.linkQuotation(TENANT, USER, itemId, foreignQuote.id)).rejects.toThrow(/not found/);
  });

  it('rejects suppliers from another tenant on item creation', async () => {
    const foreignTenant = await prisma.tenant.findFirst({ where: { slug: `svcint-f-${RUN}` } });
    const foreignVendor = await prisma.vendor.create({
      data: { tenantId: foreignTenant!.id, vendorType: 'AIRLINE', name: 'Foreign Air', code: `FA-${RUN}` },
    });
    await expect(
      cases.create(TENANT, USER, undefined, {
        title: 'Bad supplier',
        items: [{ serviceTypeCode: 'AIR_TICKET', supplierId: foreignVendor.id }],
      } as any),
    ).rejects.toThrow(/Supplier does not belong/);
  });
});

describe('Write-path serviceTypeId resolution', () => {
  it('stores serviceTypeId on quotation line items via the resolver (legacy FLIGHT input)', async () => {
    const airTicketType = await prisma.serviceType.findUnique({ where: { systemCode: 'AIR_TICKET' } });
    const { resolveServiceTypeRef } = await import('../src/modules/service-ops/service-type-map');
    const ref = await resolveServiceTypeRef(prisma as any, 'FLIGHT');
    expect(ref.code).toBe('AIR_TICKET');
    expect(ref.id).toBe(airTicketType!.id);

    const unknown = await resolveServiceTypeRef(prisma as any, 'PACKAGE');
    expect(unknown.code).toBe('PACKAGE');
    expect(unknown.id).toBeNull();
  });
});
