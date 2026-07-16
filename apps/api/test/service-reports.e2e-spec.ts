import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { ServiceTypeService } from '../src/modules/service-ops/service-type.service';
import { ServiceCaseService } from '../src/modules/service-ops/service-case.service';
import { WorkflowEngineService } from '../src/modules/service-ops/workflow-engine.service';
import { ServiceReportsService } from '../src/modules/service-ops/service-reports.service';
import { WorkflowAutomationService } from '../src/modules/service-ops/workflow-automation.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { ActivityService } from '../src/modules/activity/activity.service';

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
const reports = new ServiceReportsService(prisma as any);
const notificationStub = { notify: jest.fn().mockResolvedValue(undefined) };
const automation = new WorkflowAutomationService(prisma as any, audit, activity, notificationStub as any);

const RUN = `t${Date.now()}`;
let TENANT: string;
let USER: string;
let breachedItemId: string;
let ttlItemId: string;

beforeAll(async () => {
  await prisma.$queryRaw`SELECT 1`;
  const tenant = await prisma.tenant.create({ data: { name: `SvcRpt ${RUN}`, slug: `svcrpt-${RUN}` } });
  TENANT = tenant.id;
  const user = await prisma.user.create({
    data: { email: `svcrpt-${RUN}@test.local`, passwordHash: 'x', firstName: 'Rpt', lastName: 'Tester' },
  });
  USER = user.id;
  await cases.ensureFoundation();

  // Case 1: air ticket advanced one stage (produces a completed stage instance)
  // then forced into SLA breach; a booking link provides an imminent TTL.
  const case1 = await cases.create(TENANT, USER, undefined, {
    title: 'Report seed A',
    items: [{ serviceTypeCode: 'AIR_TICKET', serviceAmount: 1500, supplierCost: 1200 }],
  } as any);
  breachedItemId = case1.items[0].id;
  ttlItemId = breachedItemId;
  await engine.transition(TENANT, USER, case1.items[0].workflowInstanceId!, 'REQUIREMENTS_COLLECTED');

  const booking = await prisma.booking.create({
    data: {
      tenantId: TENANT, bookingRef: `BKG-RPT-${RUN}`, status: 'HELD',
      holdExpiresAt: new Date(Date.now() + 6 * 3600 * 1000),
    },
  });
  await cases.linkBooking(TENANT, USER, breachedItemId, booking.id);
  await prisma.serviceCaseItem.update({
    where: { id: breachedItemId },
    data: { slaDueAt: new Date(Date.now() - 3600 * 1000), slaStatus: 'ON_TRACK' },
  });

  // Case 2: hotel, completed quickly for completion-time aggregates.
  const case2 = await cases.create(TENANT, USER, undefined, {
    title: 'Report seed B',
    items: [{ serviceTypeCode: 'HOTEL', serviceAmount: 800, supplierCost: 600 }],
  } as any);
  await prisma.serviceCaseItem.update({
    where: { id: case2.items[0].id },
    data: { status: 'COMPLETED', completedAt: new Date() },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Service dashboard report', () => {
  it('aggregates volumes, financials and SLA counters per service in the database', async () => {
    const dashboard = await reports.dashboard(TENANT);

    expect(dashboard.totals.slaBreached).toBe(1);
    const air = dashboard.services.find((s) => s.systemCode === 'AIR_TICKET')!;
    expect(air.active).toBe(1);
    expect(air.revenue).toBe(1500);
    expect(air.profit).toBe(300);

    const hotel = dashboard.services.find((s) => s.systemCode === 'HOTEL')!;
    expect(hotel.completed).toBe(1);
    expect(hotel.avgCompletionHours).not.toBeNull();
  });

  it('lists breached items with assignee names in the SLA report', async () => {
    const sla = await reports.slaReport(TENANT);
    expect(sla.breached.some((i) => i.id === breachedItemId)).toBe(true);
    const row = sla.breached.find((i) => i.id === breachedItemId)!;
    expect(row.assigneeName).toBe('Rpt Tester');
  });

  it('reports workload per assignee with overdue counts', async () => {
    const workload = await reports.workloadReport(TENANT);
    const mine = workload.find((w) => w.assignedToId === USER)!;
    expect(mine.activeItems).toBeGreaterThanOrEqual(1);
    expect(mine.overdueItems).toBe(1);
  });

  it('computes stage bottlenecks from completed stage instances', async () => {
    const bottlenecks = await reports.bottlenecks(TENANT);
    expect(bottlenecks.slowestStages.length).toBeGreaterThanOrEqual(1);
    expect(bottlenecks.slowestStages[0]).toHaveProperty('avgHours');
    expect(bottlenecks.itemsPerStage.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Automation scans', () => {
  it('marks breaches, raises TTL alerts and creates automation tasks with notifications', async () => {
    const result = await automation.runScans(TENANT, USER);
    expect(result.breached).toBe(1);
    expect(result.ttlAlerts).toBe(1);
    expect(result.tasksCreated).toBeGreaterThanOrEqual(2);

    const item = await prisma.serviceCaseItem.findUnique({ where: { id: breachedItemId } });
    expect(item!.slaStatus).toBe('BREACHED');

    const tasks = await prisma.workflowTask.findMany({
      where: { tenantId: TENANT, serviceCaseItemId: breachedItemId, source: 'AUTOMATION' },
    });
    expect(tasks.some((t) => t.title.startsWith('SLA breached'))).toBe(true);
    expect(tasks.some((t) => t.title.startsWith('TTL approaching'))).toBe(true);
    expect(tasks.every((t) => t.priority === 'URGENT')).toBe(true);
    expect(notificationStub.notify).toHaveBeenCalled();

    const slaActivity = await prisma.activity.findFirst({
      where: { tenantId: TENANT, type: 'SLA_BREACHED', entityId: breachedItemId },
    });
    expect(slaActivity).toBeTruthy();
  });

  it('is idempotent: a second scan creates no duplicate tasks', async () => {
    const again = await automation.runScans(TENANT, USER);
    expect(again.breached).toBe(0);
    expect(again.tasksCreated).toBe(0);

    const tasks = await prisma.workflowTask.count({
      where: { tenantId: TENANT, serviceCaseItemId: ttlItemId, source: 'AUTOMATION' },
    });
    expect(tasks).toBe(2);
  });

  it('sets WARNING status for items approaching their SLA', async () => {
    const created = await cases.create(TENANT, USER, undefined, {
      title: 'Warning seed',
      items: [{ serviceTypeCode: 'VISA' }],
    } as any);
    await prisma.serviceCaseItem.update({
      where: { id: created.items[0].id },
      data: { slaDueAt: new Date(Date.now() + 2 * 3600 * 1000) },
    });

    const result = await automation.runScans(TENANT, USER);
    expect(result.warnings).toBeGreaterThanOrEqual(1);

    const item = await prisma.serviceCaseItem.findUnique({ where: { id: created.items[0].id } });
    expect(item!.slaStatus).toBe('WARNING');
  });
});
