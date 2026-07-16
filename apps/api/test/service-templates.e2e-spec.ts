import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { ServiceTypeService } from '../src/modules/service-ops/service-type.service';
import { ServiceCaseService } from '../src/modules/service-ops/service-case.service';
import { WorkflowEngineService } from '../src/modules/service-ops/workflow-engine.service';
import { CaseDocumentService } from '../src/modules/service-ops/case-document.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { ActivityService } from '../src/modules/activity/activity.service';

const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*"?([^"#]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

jest.setTimeout(120000);

const prisma = new PrismaClient();
const audit = new AuditService(prisma as any);
const activity = new ActivityService(prisma as any);
const serviceTypes = new ServiceTypeService(prisma as any, audit);
const engine = new WorkflowEngineService(prisma as any, audit, activity);
const cases = new ServiceCaseService(prisma as any, audit, activity, serviceTypes, engine);
const documents = new CaseDocumentService(prisma as any, audit, activity);

const RUN = `t${Date.now()}`;
let TENANT: string;
let USER_A: string;
let USER_B: string;

const EXPECTED_TEMPLATES: Array<[string, string, number]> = [
  ['INSURANCE', 'INSURANCE_STANDARD', 16],
  ['TRANSFER', 'TRANSFER_STANDARD', 20],
  ['UMRAH', 'UMRAH_STANDARD', 26],
  ['HAJJ', 'HAJJ_STANDARD', 31],
  ['MEDICAL_TOURISM', 'MEDICAL_TOURISM_STANDARD', 24],
  ['STUDENT_VISA', 'STUDENT_VISA_STANDARD', 32],
  ['MANPOWER', 'MANPOWER_STANDARD', 32],
  ['CRUISE', 'CRUISE_STANDARD', 26],
];

beforeAll(async () => {
  await prisma.$queryRaw`SELECT 1`;
  const tenant = await prisma.tenant.create({ data: { name: `SvcExt ${RUN}`, slug: `svcext-${RUN}` } });
  TENANT = tenant.id;
  const userA = await prisma.user.create({
    data: { email: `svcext-a-${RUN}@test.local`, passwordHash: 'x', firstName: 'Ext', lastName: 'One' },
  });
  const userB = await prisma.user.create({
    data: { email: `svcext-b-${RUN}@test.local`, passwordHash: 'x', firstName: 'Ext', lastName: 'Two' },
  });
  USER_A = userA.id;
  USER_B = userB.id;
  await cases.ensureFoundation();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Extended system templates (Phase 5)', () => {
  it.each(EXPECTED_TEMPLATES)('%s seeds %s with %i stages', async (_serviceCode, templateCode, stageCount) => {
    const template = await prisma.workflowTemplate.findFirst({
      where: { code: templateCode, isSystem: true, status: 'PUBLISHED' },
      orderBy: { version: 'desc' },
      include: { stages: true },
    });
    expect(template).toBeTruthy();
    expect(template!.stages).toHaveLength(stageCount);
    expect(template!.stages.filter((s) => s.isInitial)).toHaveLength(1);
    expect(template!.stages.filter((s) => s.isTerminal)).toHaveLength(1);
  });

  it.each(EXPECTED_TEMPLATES)('new %s cases use the dedicated template, not the generic fallback', async (serviceCode, templateCode) => {
    const created = await cases.create(TENANT, USER_A, undefined, {
      title: `${serviceCode} dedicated-template check`,
      items: [{ serviceTypeCode: serviceCode }],
    } as any);
    const item = created.items[0];
    const instance = await prisma.workflowInstance.findUnique({
      where: { id: item.workflowInstanceId! },
      include: { template: true },
    });
    expect(instance!.template.code).toBe(templateCode);
    expect(instance!.templateVersion).toBe(4);
    expect(item.currentStageCode).toMatch(/ENQUIRY_RECEIVED|REQUEST_RECEIVED|EMPLOYER_LEAD_RECEIVED/);
  });

  it('generic-template instances started earlier stay pinned to their version', async () => {
    const genericInstances = await prisma.workflowInstance.findMany({
      where: { template: { code: 'UMRAH_GENERIC' } },
      include: { template: true },
      take: 1,
    });
    for (const instance of genericInstances) {
      expect(instance.templateVersion).toBeLessThan(4);
      expect(instance.template.code).toBe('UMRAH_GENERIC');
    }
  });
});

describe('Cruise hold-expiry gate', () => {
  it('blocks leaving HOLD_EXPIRY_RECORDED until the deadline checklist is completed', async () => {
    const created = await cases.create(TENANT, USER_A, undefined, {
      title: 'Cruise hold test',
      items: [{ serviceTypeCode: 'CRUISE' }],
    } as any);
    const item = created.items[0];
    const instanceId = item.workflowInstanceId!;

    const path = ['REQUIREMENTS_COLLECTED', 'SAILINGS_SEARCHED', 'ITINERARY_COMPARED', 'CABIN_OPTIONS_COMPARED', 'VISA_REQUIREMENTS_REVIEWED', 'QUOTATION_SENT', 'SAILING_CABIN_SELECTED'];
    for (const stage of path) {
      await engine.transition(TENANT, USER_A, instanceId, stage);
    }

    // PASSENGER_INFO_COLLECTED has a name-verification checklist.
    await engine.transition(TENANT, USER_A, instanceId, 'PASSENGER_INFO_COLLECTED');
    const nameCheck = await prisma.workflowChecklistItem.findFirst({
      where: { workflowInstanceId: instanceId, stageCode: 'PASSENGER_INFO_COLLECTED' },
    });
    await engine.completeChecklistItem(TENANT, USER_A, instanceId, nameCheck!.id);

    await engine.transition(TENANT, USER_A, instanceId, 'CABIN_HELD');
    await engine.transition(TENANT, USER_A, instanceId, 'HOLD_EXPIRY_RECORDED');

    await expect(
      engine.transition(TENANT, USER_A, instanceId, 'DEPOSIT_RECEIVED'),
    ).rejects.toThrow(/TRANSITION_BLOCKED.*checklist/);

    const holdCheck = await prisma.workflowChecklistItem.findFirst({
      where: { workflowInstanceId: instanceId, stageCode: 'HOLD_EXPIRY_RECORDED', code: 'HOLD_EXPIRY' },
    });
    await engine.completeChecklistItem(TENANT, USER_A, instanceId, holdCheck!.id, 'Hold expires 2026-08-01 18:00');

    const result = await engine.transition(TENANT, USER_A, instanceId, 'DEPOSIT_RECEIVED');
    expect(result.currentStageCode).toBe('DEPOSIT_RECEIVED');
  });
});

describe('Medical tourism consent and document gates', () => {
  let itemId: string;
  let instanceId: string;

  beforeAll(async () => {
    const created = await cases.create(TENANT, USER_A, undefined, {
      title: 'Medical coordination test',
      items: [{ serviceTypeCode: 'MEDICAL_TOURISM' }],
    } as any);
    itemId = created.items[0].id;
    instanceId = created.items[0].workflowInstanceId!;
  });

  it('requires recorded consent before any medical document handling', async () => {
    await engine.transition(TENANT, USER_A, instanceId, 'PATIENT_CONSENT');
    await expect(
      engine.transition(TENANT, USER_A, instanceId, 'MEDICAL_DOCS_REQUESTED'),
    ).rejects.toThrow(/TRANSITION_BLOCKED.*checklist/);

    const consent = await prisma.workflowChecklistItem.findFirst({
      where: { workflowInstanceId: instanceId, stageCode: 'PATIENT_CONSENT', code: 'CONSENT_RECORDED' },
    });
    await engine.completeChecklistItem(TENANT, USER_A, instanceId, consent!.id, 'Signed consent form on file');
    await engine.transition(TENANT, USER_A, instanceId, 'MEDICAL_DOCS_REQUESTED');
  });

  it('blocks completeness review exit until the MEDICAL_REPORT is verified, logging sensitive access', async () => {
    await engine.transition(TENANT, USER_A, instanceId, 'MEDICAL_DOCS_RECEIVED');
    await engine.transition(TENANT, USER_A, instanceId, 'COMPLETENESS_REVIEW');

    await expect(
      engine.transition(TENANT, USER_A, instanceId, 'HOSPITAL_MATCHING'),
    ).rejects.toThrow(/MEDICAL_REPORT/);

    const report = await documents.request(TENANT, USER_A, {
      serviceCaseItemId: itemId, documentType: 'MEDICAL_REPORT', accessClassification: 'MEDICAL',
    });
    await documents.transition(TENANT, USER_A, report.id, { status: 'RECEIVED', documentId: 'stor-med-1' });
    await documents.transition(TENANT, USER_A, report.id, { status: 'UNDER_REVIEW' });
    await documents.transition(TENANT, USER_A, report.id, { status: 'VERIFIED' });

    await documents.listForItem(TENANT, USER_B, itemId);
    const log = await documents.accessLog(TENANT, report.id);
    expect(log.some((l) => l.userId === USER_B && l.action === 'VIEW')).toBe(true);

    const result = await engine.transition(TENANT, USER_A, instanceId, 'HOSPITAL_MATCHING');
    expect(result.currentStageCode).toBe('HOSPITAL_MATCHING');
  });
});

describe('Umrah payment gates', () => {
  it('enforces the deposit payment approval with segregation of duties', async () => {
    const created = await cases.create(TENANT, USER_A, undefined, {
      title: 'Umrah gates test',
      items: [{ serviceTypeCode: 'UMRAH', serviceAmount: 5200 }],
    } as any);
    const instanceId = created.items[0].workflowInstanceId!;
    const itemId = created.items[0].id;

    await engine.transition(TENANT, USER_A, instanceId, 'PACKAGE_REQUIREMENTS');
    await engine.transition(TENANT, USER_A, instanceId, 'PACKAGE_SELECTED');
    await engine.transition(TENANT, USER_A, instanceId, 'GROUP_BOOKING_CREATED');
    await engine.transition(TENANT, USER_A, instanceId, 'PILGRIM_PROFILES');
    const profiles = await prisma.workflowChecklistItem.findFirst({
      where: { workflowInstanceId: instanceId, stageCode: 'PILGRIM_PROFILES' },
    });
    await engine.completeChecklistItem(TENANT, USER_A, instanceId, profiles!.id);
    await engine.transition(TENANT, USER_A, instanceId, 'DOCUMENTS_REQUESTED');
    await engine.transition(TENANT, USER_A, instanceId, 'DOCUMENTS_VERIFIED');

    // Document gate: PASSPORT + PHOTO must be verified before leaving.
    for (const docType of ['PASSPORT', 'PHOTO']) {
      const doc = await documents.request(TENANT, USER_A, { serviceCaseItemId: itemId, documentType: docType });
      await documents.transition(TENANT, USER_A, doc.id, { status: 'RECEIVED', documentId: `stor-${docType}` });
      await documents.transition(TENANT, USER_A, doc.id, { status: 'UNDER_REVIEW' });
      await documents.transition(TENANT, USER_A, doc.id, { status: 'VERIFIED' });
    }
    await engine.transition(TENANT, USER_A, instanceId, 'DEPOSIT_RECEIVED');

    await expect(
      engine.transition(TENANT, USER_A, instanceId, 'VISA_PROCESSING'),
    ).rejects.toThrow(/payment\/credit approval/i);

    const approval = await engine.requestApproval(TENANT, USER_A, instanceId, 'Deposit of 2000 received in bank');
    expect(approval.approvalType).toBe('PAYMENT');
    await engine.decideApproval(TENANT, USER_B, approval.id, 'APPROVED', 'Bank credit confirmed');

    const result = await engine.transition(TENANT, USER_A, instanceId, 'VISA_PROCESSING');
    expect(result.currentStageCode).toBe('VISA_PROCESSING');
  });
});
