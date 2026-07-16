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

jest.setTimeout(90000);

const prisma = new PrismaClient();
const audit = new AuditService(prisma as any);
const activity = new ActivityService(prisma as any);
const serviceTypes = new ServiceTypeService(prisma as any, audit);
const engine = new WorkflowEngineService(prisma as any, audit, activity);
const cases = new ServiceCaseService(prisma as any, audit, activity, serviceTypes, engine);
const documents = new CaseDocumentService(prisma as any, audit, activity);

const RUN = `t${Date.now()}`;

let TENANT: string;
let OTHER_TENANT: string;
let USER_A: string;
let USER_B: string;

beforeAll(async () => {
  await prisma.$queryRaw`SELECT 1`;

  const tenant = await prisma.tenant.create({ data: { name: `SvcOps ${RUN}`, slug: `svcops-${RUN}` } });
  const other = await prisma.tenant.create({ data: { name: `SvcOps other ${RUN}`, slug: `svcops-o-${RUN}` } });
  TENANT = tenant.id;
  OTHER_TENANT = other.id;

  const userA = await prisma.user.create({
    data: { email: `svcops-a-${RUN}@test.local`, passwordHash: 'x', firstName: 'Op', lastName: 'One' },
  });
  const userB = await prisma.user.create({
    data: { email: `svcops-b-${RUN}@test.local`, passwordHash: 'x', firstName: 'Op', lastName: 'Two' },
  });
  USER_A = userA.id;
  USER_B = userB.id;

  await cases.ensureFoundation();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Service type master', () => {
  it('seeds the 12 immutable system service types', async () => {
    const types = await serviceTypes.listForTenant(TENANT);
    const codes = types.map((t) => t.systemCode);
    for (const code of ['AIR_TICKET', 'VISA', 'HOTEL', 'TOUR', 'INSURANCE', 'TRANSFER', 'UMRAH', 'HAJJ', 'MEDICAL_TOURISM', 'STUDENT_VISA', 'MANPOWER', 'CRUISE']) {
      expect(codes).toContain(code);
    }
    expect(types).toHaveLength(12);
  });

  it('lets a tenant rename and disable a service without changing the system code', async () => {
    await serviceTypes.configure(TENANT, USER_A, 'CRUISE', { isEnabled: false, displayName: 'Sea Voyages' });
    const enabled = await serviceTypes.listForTenant(TENANT);
    expect(enabled.find((t) => t.systemCode === 'CRUISE')).toBeUndefined();

    const all = await serviceTypes.listForTenant(TENANT, true);
    const cruise = all.find((t) => t.systemCode === 'CRUISE')!;
    expect(cruise.displayName).toBe('Sea Voyages');
    expect(cruise.isEnabled).toBe(false);

    await expect(
      cases.create(TENANT, USER_A, undefined, {
        title: 'Cruise attempt', items: [{ serviceTypeCode: 'CRUISE' }],
      } as any),
    ).rejects.toThrow(/disabled/);
  });

  it('seeds published system workflow templates for the first four services', async () => {
    const templates = await prisma.workflowTemplate.findMany({
      where: { isSystem: true, status: 'PUBLISHED' },
      include: { stages: true },
    });
    const byCode = new Map(templates.map((t) => [t.code, t]));
    expect(byCode.get('AIR_TICKET_STANDARD')!.stages).toHaveLength(18);
    expect(byCode.get('VISA_STANDARD')!.stages).toHaveLength(21);
    expect(byCode.get('HOTEL_STANDARD')!.stages).toHaveLength(18);
    expect(byCode.get('TOUR_STANDARD')!.stages).toHaveLength(24);
  });
});

describe('Multi-service case creation', () => {
  let caseId: string;

  it('creates a case with two service items, gapless numbers and auto-started workflows', async () => {
    const created = await cases.create(TENANT, USER_A, undefined, {
      title: 'Umrah family trip',
      priority: 'HIGH',
      items: [
        { serviceTypeCode: 'AIR_TICKET', serviceAmount: 2400, supplierCost: 2000 },
        { serviceTypeCode: 'VISA', serviceAmount: 600, supplierCost: 350 },
      ],
    } as any);
    caseId = created.id;

    expect(created.caseNumber).toMatch(/^CASE-\d{4}-\d{6}$/);
    expect(created.items).toHaveLength(2);
    expect(Number(created.expectedRevenue)).toBe(3000);

    const air = created.items.find((i) => i.serviceType.systemCode === 'AIR_TICKET')!;
    expect(air.referenceNumber).toMatch(/^AIR_TICKET-\d{4}-\d{6}$/);
    expect(air.currentStageCode).toBe('ENQUIRY_RECEIVED');
    expect(air.workflowInstanceId).toBeTruthy();
    expect(air.slaDueAt).toBeTruthy();
    expect(Number(air.grossProfit)).toBe(400);

    const activityRows = await prisma.activity.findMany({ where: { tenantId: TENANT, entity: 'ServiceCase', entityId: caseId } });
    expect(activityRows.length).toBeGreaterThanOrEqual(1);
    const auditRows = await prisma.auditLog.findMany({ where: { tenantId: TENANT, entity: 'ServiceCase', entityId: caseId } });
    expect(auditRows.length).toBeGreaterThanOrEqual(1);
  });

  it('is tenant-isolated', async () => {
    await expect(cases.findById(OTHER_TENANT, caseId)).rejects.toThrow(/not found/);
  });

  it('rejects cases without items', async () => {
    await expect(
      cases.create(TENANT, USER_A, undefined, { title: 'Empty', items: [] } as any),
    ).rejects.toThrow(/at least one service item/);
  });
});

describe('Workflow transitions and gates', () => {
  let itemId: string;

  beforeAll(async () => {
    const created = await cases.create(TENANT, USER_A, undefined, {
      title: 'Air ticket workflow test',
      items: [{ serviceTypeCode: 'AIR_TICKET', serviceAmount: 900 }],
    } as any);
    itemId = created.items[0].id;
  });

  async function instanceId(): Promise<string> {
    const item = await cases.getItem(TENANT, itemId);
    return item.workflowInstanceId!;
  }

  it('advances through open stages and tracks the current stage on the item', async () => {
    await engine.transition(TENANT, USER_A, await instanceId(), 'REQUIREMENTS_COLLECTED');
    await engine.transition(TENANT, USER_A, await instanceId(), 'FLIGHT_SEARCH');
    const item = await cases.getItem(TENANT, itemId);
    expect(item.currentStageCode).toBe('FLIGHT_SEARCH');

    const history = await prisma.workflowStatusHistory.findMany({ where: { workflowInstanceId: item.workflowInstanceId! } });
    expect(history.length).toBeGreaterThanOrEqual(3);
  });

  it('rejects skipping stages', async () => {
    await expect(
      engine.transition(TENANT, USER_A, await instanceId(), 'TICKET_ISSUED'),
    ).rejects.toThrow(/TRANSITION_NOT_ALLOWED/);
  });

  it('blocks a transition while mandatory checklist items are open, then allows after completion', async () => {
    await engine.transition(TENANT, USER_A, await instanceId(), 'OPTIONS_PREPARED');
    await engine.transition(TENANT, USER_A, await instanceId(), 'FARE_RULES_VERIFIED');

    await expect(
      engine.transition(TENANT, USER_A, await instanceId(), 'QUOTATION_SENT'),
    ).rejects.toThrow(/TRANSITION_BLOCKED.*checklist/);

    const available = await engine.getAvailableTransitions(TENANT, await instanceId());
    expect(available.canTransition).toBe(false);
    expect(available.blockers.some((b) => b.type === 'CHECKLIST')).toBe(true);

    const checklist = await prisma.workflowChecklistItem.findFirst({
      where: { workflowInstanceId: await instanceId(), stageCode: 'FARE_RULES_VERIFIED', code: 'FARE_RULES' },
    });
    await engine.completeChecklistItem(TENANT, USER_A, await instanceId(), checklist!.id, 'Fare rules PDF attached');

    const result = await engine.transition(TENANT, USER_A, await instanceId(), 'QUOTATION_SENT');
    expect(result.currentStageCode).toBe('QUOTATION_SENT');
  });

  it('blocks the payment stage until an approval is granted by a second user', async () => {
    await engine.transition(TENANT, USER_A, await instanceId(), 'OPTION_SELECTED');

    // PASSENGER_DETAILS has a mandatory name-verification checklist item.
    await engine.transition(TENANT, USER_A, await instanceId(), 'PASSENGER_DETAILS');
    const nameCheck = await prisma.workflowChecklistItem.findFirst({
      where: { workflowInstanceId: await instanceId(), stageCode: 'PASSENGER_DETAILS' },
    });
    await engine.completeChecklistItem(TENANT, USER_A, await instanceId(), nameCheck!.id);

    await engine.transition(TENANT, USER_A, await instanceId(), 'PNR_CREATED');
    await engine.transition(TENANT, USER_A, await instanceId(), 'TTL_RECORDED');
    const ttlCheck = await prisma.workflowChecklistItem.findFirst({
      where: { workflowInstanceId: await instanceId(), stageCode: 'TTL_RECORDED' },
    });
    await engine.completeChecklistItem(TENANT, USER_A, await instanceId(), ttlCheck!.id);
    await engine.transition(TENANT, USER_A, await instanceId(), 'PAYMENT_PENDING');
    await engine.transition(TENANT, USER_A, await instanceId(), 'PAYMENT_APPROVED');

    await expect(
      engine.transition(TENANT, USER_A, await instanceId(), 'FINAL_FARE_VERIFICATION'),
    ).rejects.toThrow(/TRANSITION_BLOCKED.*approval/i);

    const approval = await engine.requestApproval(TENANT, USER_A, await instanceId(), 'Client paid by bank transfer');
    expect(approval.approvalType).toBe('PAYMENT');

    await expect(
      engine.decideApproval(TENANT, USER_A, approval.id, 'APPROVED'),
    ).rejects.toThrow(/SOD_VIOLATION/);

    await expect(
      engine.decideApproval(TENANT, USER_B, approval.id, 'REJECTED'),
    ).rejects.toThrow(/requires a note/);

    await engine.decideApproval(TENANT, USER_B, approval.id, 'APPROVED', 'Payment confirmed');

    const result = await engine.transition(TENANT, USER_A, await instanceId(), 'FINAL_FARE_VERIFICATION');
    expect(result.currentStageCode).toBe('FINAL_FARE_VERIFICATION');
  });

  it('exposes a stepper timeline with stage states', async () => {
    const timeline = await engine.getTimeline(TENANT, await instanceId());
    expect(timeline.stages).toHaveLength(18);
    const current = timeline.stages.find((s) => s.state === 'CURRENT');
    expect(current!.code).toBe('FINAL_FARE_VERIFICATION');
    expect(timeline.stages.filter((s) => s.state === 'COMPLETED').length).toBeGreaterThanOrEqual(9);
    expect(timeline.stages.filter((s) => s.state === 'UPCOMING').length).toBeGreaterThanOrEqual(4);
  });
});

describe('Visa document lifecycle gates', () => {
  let itemId: string;
  let passportDocId: string;

  beforeAll(async () => {
    const created = await cases.create(TENANT, USER_A, undefined, {
      title: 'Visa documentation test',
      items: [{ serviceTypeCode: 'VISA', serviceAmount: 300 }],
    } as any);
    itemId = created.items[0].id;

    const item = await cases.getItem(TENANT, itemId);
    const stages = ['DESTINATION_SELECTED', 'ELIGIBILITY_ASSESSMENT', 'SCOPE_FEES_SHARED', 'AGREEMENT_ACCEPTED', 'CASE_OPENED', 'CHECKLIST_GENERATED', 'DOCUMENTS_REQUESTED', 'DOCUMENTS_RECEIVED', 'DOCUMENT_VERIFICATION'];
    for (const stage of stages) {
      await engine.transition(TENANT, USER_A, item.workflowInstanceId!, stage);
    }
  });

  it('blocks verification exit while required documents are not verified', async () => {
    const item = await cases.getItem(TENANT, itemId);
    await expect(
      engine.transition(TENANT, USER_A, item.workflowInstanceId!, 'APPLICATION_PREPARED'),
    ).rejects.toThrow(/TRANSITION_BLOCKED.*PASSPORT/);
  });

  it('walks a document through the correction loop to VERIFIED', async () => {
    const passport = await documents.request(TENANT, USER_A, {
      serviceCaseItemId: itemId, documentType: 'PASSPORT', accessClassification: 'SENSITIVE',
    });
    passportDocId = passport.id;

    await expect(
      documents.transition(TENANT, USER_A, passport.id, { status: 'VERIFIED' }),
    ).rejects.toThrow(/DOCUMENT_TRANSITION_INVALID/);

    await documents.transition(TENANT, USER_A, passport.id, { status: 'RECEIVED', documentId: 'storage-doc-1' });
    await documents.transition(TENANT, USER_A, passport.id, { status: 'UNDER_REVIEW' });
    await documents.transition(TENANT, USER_A, passport.id, {
      status: 'CORRECTION_REQUIRED', correctionInstructions: 'Photo page is blurry',
    });
    await documents.transition(TENANT, USER_A, passport.id, { status: 'RESUBMITTED', documentId: 'storage-doc-2' });
    await documents.transition(TENANT, USER_A, passport.id, { status: 'UNDER_REVIEW' });
    const verified = await documents.transition(TENANT, USER_A, passport.id, { status: 'VERIFIED' });
    expect(verified.status).toBe('VERIFIED');
    expect(verified.version).toBe(2);
  });

  it('still blocks until every required document type is verified, then passes', async () => {
    const item = await cases.getItem(TENANT, itemId);
    await expect(
      engine.transition(TENANT, USER_A, item.workflowInstanceId!, 'APPLICATION_PREPARED'),
    ).rejects.toThrow(/PHOTO/);

    const photo = await documents.request(TENANT, USER_A, { serviceCaseItemId: itemId, documentType: 'PHOTO' });
    await documents.transition(TENANT, USER_A, photo.id, { status: 'RECEIVED', documentId: 'storage-doc-3' });
    await documents.transition(TENANT, USER_A, photo.id, { status: 'UNDER_REVIEW' });
    await documents.transition(TENANT, USER_A, photo.id, { status: 'VERIFIED' });

    const result = await engine.transition(TENANT, USER_A, item.workflowInstanceId!, 'APPLICATION_PREPARED');
    expect(result.currentStageCode).toBe('APPLICATION_PREPARED');
  });

  it('records an access log for sensitive documents', async () => {
    await documents.listForItem(TENANT, USER_B, itemId);
    const log = await documents.accessLog(TENANT, passportDocId);
    expect(log.some((l) => l.userId === USER_B && l.action === 'VIEW')).toBe(true);
  });
});

describe('Case closure and reopening', () => {
  let caseId: string;
  let itemId: string;

  beforeAll(async () => {
    const created = await cases.create(TENANT, USER_A, undefined, {
      title: 'Closure test',
      items: [{ serviceTypeCode: 'HOTEL', serviceAmount: 500 }],
    } as any);
    caseId = created.id;
    itemId = created.items[0].id;
  });

  it('blocks closing while items are active, allows force with reason, records audit', async () => {
    await expect(cases.close(TENANT, USER_A, caseId, {})).rejects.toThrow(/CASE_CLOSE_BLOCKED/);
    await expect(cases.close(TENANT, USER_A, caseId, { force: true })).rejects.toThrow(/requires a reason/);

    const closed = await cases.close(TENANT, USER_A, caseId, { force: true, reason: 'Customer went silent' });
    expect(closed.status).toBe('CLOSED');

    const auditRow = await prisma.auditLog.findFirst({
      where: { tenantId: TENANT, entity: 'ServiceCase', entityId: caseId, action: 'STATUS_CHANGE' },
      orderBy: { createdAt: 'desc' },
    });
    expect(auditRow).toBeTruthy();
  });

  it('reopens with a reason', async () => {
    const reopened = await cases.reopen(TENANT, USER_A, caseId, { reason: 'Customer came back' });
    expect(reopened.status).toBe('IN_PROGRESS');
    expect(reopened.reopenReason).toBe('Customer came back');
  });

  it('cancels an item with a reason and cancels its workflow', async () => {
    const cancelled = await cases.cancelItem(TENANT, USER_A, itemId, 'Hotel no longer needed');
    expect(cancelled.status).toBe('CANCELLED');

    const item = await cases.getItem(TENANT, itemId);
    const instance = await prisma.workflowInstance.findUnique({ where: { id: item.workflowInstanceId! } });
    expect(instance!.status).toBe('CANCELLED');

    const closed = await cases.close(TENANT, USER_A, caseId, { reason: 'All items resolved' });
    expect(closed.status).toBe('CLOSED');
  });
});

describe('Financial summary', () => {
  it('aggregates revenue, cost and profit per case', async () => {
    const created = await cases.create(TENANT, USER_A, undefined, {
      title: 'Finance roll-up',
      items: [
        { serviceTypeCode: 'AIR_TICKET', serviceAmount: 1000, supplierCost: 800 },
        { serviceTypeCode: 'HOTEL', serviceAmount: 400, supplierCost: 250 },
      ],
    } as any);
    const summary = await cases.financialSummary(TENANT, created.id);
    expect(summary.totals.serviceAmount).toBe(1400);
    expect(summary.totals.supplierCost).toBe(1050);
    expect(summary.totals.grossProfit).toBe(350);
  });
});
