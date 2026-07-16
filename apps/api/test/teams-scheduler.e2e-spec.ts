import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { ServiceTypeService } from '../src/modules/service-ops/service-type.service';
import { ServiceCaseService } from '../src/modules/service-ops/service-case.service';
import { WorkflowEngineService } from '../src/modules/service-ops/workflow-engine.service';
import { WorkflowAutomationService } from '../src/modules/service-ops/workflow-automation.service';
import { AutomationSchedulerService } from '../src/modules/service-ops/automation-scheduler.service';
import { TeamService } from '../src/modules/service-ops/team.service';
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
const teams = new TeamService(prisma as any, audit);
const notificationStub = { notify: jest.fn().mockResolvedValue(undefined) };
const automation = new WorkflowAutomationService(prisma as any, audit, activity, notificationStub as any);
const scheduler = new AutomationSchedulerService(prisma as any, automation);

const RUN = `t${Date.now()}`;
let TENANT: string;
let MEMBER_A: string;
let MEMBER_B: string;
let OUTSIDER: string;

beforeAll(async () => {
  await prisma.$queryRaw`SELECT 1`;
  const tenant = await prisma.tenant.create({ data: { name: `Teams ${RUN}`, slug: `teams-${RUN}` } });
  TENANT = tenant.id;

  const [a, b, outsider] = await Promise.all([
    prisma.user.create({ data: { email: `team-a-${RUN}@test.local`, passwordHash: 'x', firstName: 'Alpha', lastName: 'Member' } }),
    prisma.user.create({ data: { email: `team-b-${RUN}@test.local`, passwordHash: 'x', firstName: 'Beta', lastName: 'Member' } }),
    prisma.user.create({ data: { email: `team-o-${RUN}@test.local`, passwordHash: 'x', firstName: 'Out', lastName: 'Sider' } }),
  ]);
  MEMBER_A = a.id;
  MEMBER_B = b.id;
  OUTSIDER = outsider.id;

  await prisma.userTenantMembership.createMany({
    data: [
      { userId: MEMBER_A, tenantId: TENANT, role: 'OWNER' },
      { userId: MEMBER_B, tenantId: TENANT, role: 'MEMBER' },
    ],
  });
  await cases.ensureFoundation();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Team management', () => {
  let teamId: string;

  it('creates a team and enrolls the leader as a member', async () => {
    const team = await teams.create(TENANT, MEMBER_A, {
      name: 'Visa Ops', code: 'visa_ops', description: 'Visa processing squad', leaderId: MEMBER_A,
    });
    teamId = team.id;
    expect(team.code).toBe('VISA_OPS');

    const listed = await teams.findAll(TENANT);
    const visaOps = listed.find((t) => t.id === teamId)!;
    expect(visaOps.leader?.id).toBe(MEMBER_A);
    expect(visaOps.members.some((m) => m.user.id === MEMBER_A && m.role === 'LEADER')).toBe(true);
  });

  it('rejects duplicate team codes', async () => {
    await expect(
      teams.create(TENANT, MEMBER_A, { name: 'Another', code: 'VISA_OPS' }),
    ).rejects.toThrow(/already exists/);
  });

  it('adds tenant members and rejects outsiders', async () => {
    await teams.addMember(TENANT, MEMBER_A, teamId, MEMBER_B);
    await expect(teams.addMember(TENANT, MEMBER_A, teamId, MEMBER_B)).rejects.toThrow(/already a member/);
    await expect(teams.addMember(TENANT, MEMBER_A, teamId, OUTSIDER)).rejects.toThrow(/not an active member/);
  });

  it('protects the leader from removal and removes regular members', async () => {
    await expect(teams.removeMember(TENANT, MEMBER_A, teamId, MEMBER_A)).rejects.toThrow(/team leader/);
    const result = await teams.removeMember(TENANT, MEMBER_A, teamId, MEMBER_B);
    expect(result.removed).toBe(true);
  });

  it('assigns teams to service cases with tenant validation', async () => {
    const created = await cases.create(TENANT, MEMBER_A, undefined, {
      title: 'Team-assigned case',
      teamId,
      items: [{ serviceTypeCode: 'VISA' }],
    } as any);
    expect(created.team?.code).toBe('VISA_OPS');

    const foreignTenant = await prisma.tenant.create({ data: { name: `Teams F ${RUN}`, slug: `teams-f-${RUN}` } });
    await expect(
      cases.create(foreignTenant.id, MEMBER_A, undefined, {
        title: 'Cross-tenant team', teamId, items: [{ serviceTypeCode: 'VISA' }],
      } as any),
    ).rejects.toThrow(/Team does not belong/);
  });
});

describe('Automation scheduler', () => {
  it('resolves the earliest active tenant member as the system actor', async () => {
    const actor = await scheduler.resolveSystemActor(TENANT);
    expect(actor).toBe(MEMBER_A);
  });

  it('scans every tenant with active items and skips tenants without members', async () => {
    const created = await cases.create(TENANT, MEMBER_A, undefined, {
      title: 'Scheduler breach seed',
      items: [{ serviceTypeCode: 'HOTEL' }],
    } as any);
    await prisma.serviceCaseItem.update({
      where: { id: created.items[0].id },
      data: { slaDueAt: new Date(Date.now() - 3600 * 1000) },
    });

    const orphanTenant = await prisma.tenant.create({ data: { name: `Teams O ${RUN}`, slug: `teams-o-${RUN}` } });
    const orphanCase = await cases.create(orphanTenant.id, OUTSIDER, undefined, {
      title: 'Orphan tenant case',
      items: [{ serviceTypeCode: 'HOTEL' }],
    } as any);
    expect(orphanCase.id).toBeTruthy();

    const result = await scheduler.scanAllTenants();
    expect(result.skipped).toBe(false);
    expect(result.tenantsScanned).toBeGreaterThanOrEqual(1);

    const item = await prisma.serviceCaseItem.findUnique({ where: { id: created.items[0].id } });
    expect(item!.slaStatus).toBe('BREACHED');

    const task = await prisma.workflowTask.findFirst({
      where: { tenantId: TENANT, serviceCaseItemId: created.items[0].id, source: 'AUTOMATION' },
    });
    expect(task).toBeTruthy();
  });

  it('stays disabled without the interval env variable', () => {
    delete process.env.AUTOMATION_SCAN_INTERVAL_MINUTES;
    scheduler.onModuleInit();
    expect((scheduler as any).timer).toBeNull();
    scheduler.onModuleDestroy();
  });
});
