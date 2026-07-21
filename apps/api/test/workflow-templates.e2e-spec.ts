import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { ServiceTypeService } from '../src/modules/service-ops/service-type.service';
import { ServiceCaseService } from '../src/modules/service-ops/service-case.service';
import { WorkflowEngineService } from '../src/modules/service-ops/workflow-engine.service';
import { WorkflowTemplateService } from '../src/modules/service-ops/workflow-template.service';
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
const templates = new WorkflowTemplateService(prisma as any, audit);

const RUN = `t${Date.now()}`;
let TENANT: string;
let USER: string;

beforeAll(async () => {
  await prisma.$queryRaw`SELECT 1`;
  const tenant = await prisma.tenant.create({ data: { name: `TplEd ${RUN}`, slug: `tpled-${RUN}` } });
  TENANT = tenant.id;
  const user = await prisma.user.create({
    data: { email: `tpled-${RUN}@test.local`, passwordHash: 'x', firstName: 'Tpl', lastName: 'Editor' },
  });
  USER = user.id;
  await cases.ensureFoundation();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Intake fields', () => {
  it('exposes default intake fields per service type', async () => {
    const list = await serviceTypes.listForTenant(TENANT);
    const air = list.find((t) => t.systemCode === 'AIR_TICKET')!;
    expect(air.intakeFields.map((f: any) => f.key)).toEqual(
      expect.arrayContaining(['origin', 'destination', 'departureDate', 'passengers']),
    );
    const visa = list.find((t) => t.systemCode === 'VISA')!;
    expect(visa.intakeFields.some((f: any) => f.key === 'destinationCountry' && f.required)).toBe(true);
  });

  it('lets tenant configuration override the intake field list', async () => {
    await serviceTypes.configure(TENANT, USER, 'CRUISE', {
      configuration: { intakeFields: [{ key: 'shipName', label: 'Ship', type: 'text', required: true }] },
    });
    const list = await serviceTypes.listForTenant(TENANT);
    const cruise = list.find((t) => t.systemCode === 'CRUISE')!;
    expect(cruise.intakeFields).toHaveLength(1);
    expect(cruise.intakeFields[0].key).toBe('shipName');
  });

  it('stores intake data in the item metadata on case creation', async () => {
    const created = await cases.create(TENANT, USER, undefined, {
      title: 'Intake capture',
      items: [{
        serviceTypeCode: 'AIR_TICKET',
        metadata: { origin: 'DAC', destination: 'DXB', departureDate: '2026-09-01', passengers: '2' },
      }],
    } as any);
    const meta = created.items[0].metadata as any;
    expect(meta.origin).toBe('DAC');
    expect(meta.destination).toBe('DXB');
  });
});

describe('Tenant workflow template editor', () => {
  let draftId: string;

  it('lists system templates and clones one into a tenant draft', async () => {
    const all = await templates.list(TENANT, 'HOTEL');
    const system = all.find((t) => t.isSystem && t.status === 'PUBLISHED')!;
    expect(system.stageCount).toBe(18);

    const draft = await templates.clone(TENANT, USER, system.id, 'Hotel Express');
    draftId = draft.id;
    expect(draft.status).toBe('DRAFT');
    expect(draft.tenantId).toBe(TENANT);
    expect(draft.stages).toHaveLength(18);
  });

  it('rejects editing system templates directly', async () => {
    const all = await templates.list(TENANT, 'HOTEL');
    const system = all.find((t) => t.isSystem)!;
    await expect(
      templates.updateDraft(TENANT, USER, system.id, { name: 'Hacked' }),
    ).rejects.toThrow(/immutable/);
  });

  it('validates stage payloads and rejects broken drafts', async () => {
    await expect(
      templates.updateDraft(TENANT, USER, draftId, {
        stages: [
          { code: 'ONLY', name: 'Only Stage', isInitial: true },
        ],
      }),
    ).rejects.toThrow(/at least two stages/);

    await expect(
      templates.updateDraft(TENANT, USER, draftId, {
        stages: [
          { code: 'A', name: 'Start', isInitial: true },
          { code: 'A', name: 'Duplicate' },
          { code: 'END', name: 'Close', isTerminal: true },
        ],
      }),
    ).rejects.toThrow(/unique/);

    await expect(
      templates.updateDraft(TENANT, USER, draftId, {
        stages: [
          { code: 'A', name: 'Start', isInitial: true },
          { code: 'B', name: 'Middle' },
        ],
      }),
    ).rejects.toThrow(/terminal/);
  });

  it('accepts a valid simplified stage list', async () => {
    const updated = await templates.updateDraft(TENANT, USER, draftId, {
      name: 'Hotel Express',
      stages: [
        { code: 'ENQUIRY', name: 'Enquiry', stageGroup: 'INTAKE', slaHours: 2, isInitial: true },
        { code: 'BOOKED', name: 'Booked', stageGroup: 'BOOKING', requiresPayment: true },
        { code: 'CHECKED_OUT', name: 'Checked Out', stageGroup: 'DELIVERY' },
        { code: 'CLOSED', name: 'Closed', stageGroup: 'CLOSURE', isTerminal: true },
      ],
    });
    expect(updated.stages).toHaveLength(4);
    expect(updated.stages[1].requiresPayment).toBe(true);
  });

  it('publishes the draft with a version outranking every existing template', async () => {
    const published = await templates.publish(TENANT, USER, draftId);
    expect(published.status).toBe('PUBLISHED');
    expect(published.version).toBeGreaterThanOrEqual(4);

    await expect(templates.publish(TENANT, USER, draftId)).rejects.toThrow(/already PUBLISHED/);
  });

  it('routes new cases through the published tenant customization', async () => {
    const created = await cases.create(TENANT, USER, undefined, {
      title: 'Custom hotel flow',
      items: [{ serviceTypeCode: 'HOTEL' }],
    } as any);
    const instance = await prisma.workflowInstance.findUnique({
      where: { id: created.items[0].workflowInstanceId! },
      include: { template: true },
    });
    expect(instance!.template.id).toBe(draftId);
    expect(created.items[0].currentStageCode).toBe('ENQUIRY');

    // The 4-stage custom flow works end to end, including the payment gate.
    const instanceId = created.items[0].workflowInstanceId!;
    await engine.transition(TENANT, USER, instanceId, 'BOOKED');
    await expect(engine.transition(TENANT, USER, instanceId, 'CHECKED_OUT')).rejects.toThrow(/payment/i);
  });

  it('published templates are immutable and archivable', async () => {
    await expect(
      templates.updateDraft(TENANT, USER, draftId, { name: 'Too late' }),
    ).rejects.toThrow(/Only DRAFT/);

    const archived = await templates.archive(TENANT, USER, draftId);
    expect(archived.status).toBe('ARCHIVED');

    // With the customization archived, new cases fall back to the system template.
    const created = await cases.create(TENANT, USER, undefined, {
      title: 'Fallback hotel flow',
      items: [{ serviceTypeCode: 'HOTEL' }],
    } as any);
    const instance = await prisma.workflowInstance.findUnique({
      where: { id: created.items[0].workflowInstanceId! },
      include: { template: true },
    });
    expect(instance!.template.isSystem).toBe(true);
    expect(instance!.template.code).toBe('HOTEL_STANDARD');
  });
});
