import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ActivityService } from '../activity/activity.service';
import { SYSTEM_WORKFLOW_TEMPLATES, SYSTEM_TEMPLATE_VERSION, WorkflowTemplateDefinition } from './templates/system-templates';

type Db = PrismaService | Prisma.TransactionClient;

export interface TransitionBlocker {
  type: 'DOCUMENT' | 'CHECKLIST' | 'APPROVAL' | 'PAYMENT' | 'STAGE';
  detail: string;
}

const DOC_SATISFIED_STATUSES = ['VERIFIED', 'SUBMITTED'];

/**
 * Versioned workflow engine. Transitions are validated server-side:
 * required documents, checklist items, approvals and payment approvals
 * on the CURRENT stage must be satisfied before moving forward.
 * Every transition writes status history, activity, audit and SLA data.
 */
@Injectable()
export class WorkflowEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly activity: ActivityService,
  ) {}

  // ─── System template seeding ────────────────────────────────

  async ensureSystemTemplate(def: WorkflowTemplateDefinition): Promise<string> {
    const serviceType = await this.prisma.serviceType.findUnique({ where: { systemCode: def.serviceTypeCode } });
    if (!serviceType) throw new NotFoundException(`Service type ${def.serviceTypeCode} missing; seed service types first`);

    const existing = await this.prisma.workflowTemplate.findFirst({
      where: { code: def.code, isSystem: true, tenantId: null },
      orderBy: { version: 'desc' },
    });
    if (existing && existing.version >= SYSTEM_TEMPLATE_VERSION) return existing.id;

    const template = await this.prisma.workflowTemplate.create({
      data: {
        tenantId: null,
        serviceTypeId: serviceType.id,
        code: def.code,
        name: def.name,
        description: def.description,
        version: SYSTEM_TEMPLATE_VERSION,
        status: 'PUBLISHED',
        isSystem: true,
        publishedAt: new Date(),
      },
    });
    let order = 1;
    for (const stage of def.stages) {
      await this.prisma.workflowStageTemplate.create({
        data: {
          templateId: template.id,
          code: stage.code,
          name: stage.name,
          displayOrder: order++,
          stageGroup: stage.group,
          slaHours: stage.slaHours,
          isInitial: stage.isInitial ?? false,
          isTerminal: stage.isTerminal ?? false,
          requiredDocumentTypes: stage.requiredDocumentTypes ?? undefined,
          requiredChecklist: stage.requiredChecklist ?? undefined,
          requiresApproval: stage.requiresApproval ?? false,
          requiresPayment: stage.requiresPayment ?? false,
          allowedNextStageCodes: stage.extraNextStageCodes ?? undefined,
          metadata: stage.isSideStage ? { isSideStage: true } : undefined,
        },
      });
    }
    return template.id;
  }

  async ensureAllSystemTemplates() {
    for (const def of SYSTEM_WORKFLOW_TEMPLATES) {
      await this.ensureSystemTemplate(def);
    }
  }

  /** Latest published template for a service type: tenant custom first, then system. */
  async resolveTemplate(tenantId: string, serviceTypeId: string, preferredTemplateId?: string | null) {
    if (preferredTemplateId) {
      const preferred = await this.prisma.workflowTemplate.findFirst({
        where: {
          id: preferredTemplateId,
          serviceTypeId,
          status: 'PUBLISHED',
          OR: [{ tenantId }, { tenantId: null, isSystem: true }],
        },
        include: { stages: { orderBy: { displayOrder: 'asc' } } },
      });
      if (preferred) return preferred;
    }
    const tenantTemplate = await this.prisma.workflowTemplate.findFirst({
      where: { tenantId, serviceTypeId, status: 'PUBLISHED' },
      orderBy: { version: 'desc' },
      include: { stages: { orderBy: { displayOrder: 'asc' } } },
    });
    if (tenantTemplate) return tenantTemplate;

    const systemTemplate = await this.prisma.workflowTemplate.findFirst({
      where: { tenantId: null, isSystem: true, serviceTypeId, status: 'PUBLISHED' },
      orderBy: { version: 'desc' },
      include: { stages: { orderBy: { displayOrder: 'asc' } } },
    });
    return systemTemplate;
  }

  // ─── Instance lifecycle ─────────────────────────────────────

  async startInstance(db: Db, tenantId: string, actorId: string, templateId: string): Promise<{ instanceId: string; initialStageCode: string; slaDueAt: Date | null }> {
    const template = await db.workflowTemplate.findFirst({
      where: { id: templateId },
      include: { stages: { orderBy: { displayOrder: 'asc' } } },
    });
    if (!template || template.stages.length === 0) {
      throw new BadRequestException('Workflow template not found or has no stages');
    }
    const initial = template.stages.find((s) => s.isInitial) ?? template.stages[0];
    const slaDueAt = initial.slaHours ? new Date(Date.now() + initial.slaHours * 3600 * 1000) : null;

    const instance = await db.workflowInstance.create({
      data: {
        tenantId,
        templateId: template.id,
        templateVersion: template.version,
        currentStageCode: initial.code,
      },
    });

    await db.workflowStageInstance.create({
      data: {
        tenantId,
        workflowInstanceId: instance.id,
        stageCode: initial.code,
        stageName: initial.name,
        stageGroup: initial.stageGroup,
        sequence: 1,
        slaDueAt,
        enteredById: actorId,
      },
    });

    await this.seedChecklist(db, tenantId, instance.id, initial);

    await db.workflowStatusHistory.create({
      data: { tenantId, workflowInstanceId: instance.id, toStageCode: initial.code, action: 'START', actorId },
    });

    return { instanceId: instance.id, initialStageCode: initial.code, slaDueAt };
  }

  private async seedChecklist(db: Db, tenantId: string, instanceId: string, stage: { code: string; requiredChecklist: Prisma.JsonValue }) {
    const checklist = (stage.requiredChecklist as Array<{ code: string; title: string }> | null) ?? [];
    let sortOrder = 0;
    for (const item of checklist) {
      await db.workflowChecklistItem.upsert({
        where: { workflowInstanceId_stageCode_code: { workflowInstanceId: instanceId, stageCode: stage.code, code: item.code } },
        update: {},
        create: {
          tenantId,
          workflowInstanceId: instanceId,
          stageCode: stage.code,
          code: item.code,
          title: item.title,
          sortOrder: sortOrder++,
        },
      });
    }
  }

  // ─── Transition gating ──────────────────────────────────────

  private async loadInstanceWithTemplate(tenantId: string, instanceId: string) {
    const instance = await this.prisma.workflowInstance.findFirst({
      where: { id: instanceId, tenantId },
      include: { template: { include: { stages: { orderBy: { displayOrder: 'asc' } } } }, caseItem: true },
    });
    if (!instance) throw new NotFoundException('Workflow instance not found');
    return instance;
  }

  private isSideStage(stage: { metadata: Prisma.JsonValue }): boolean {
    return Boolean((stage.metadata as { isSideStage?: boolean } | null)?.isSideStage);
  }

  private allowedTargets(
    stages: Array<{ code: string; displayOrder: number; allowedNextStageCodes: Prisma.JsonValue; isTerminal: boolean; metadata: Prisma.JsonValue }>,
    currentCode: string,
  ): string[] {
    const current = stages.find((s) => s.code === currentCode);
    if (!current || current.isTerminal) return [];
    const targets: string[] = [];

    // Side stages (correction/revision loops) only lead where they explicitly point.
    if (!this.isSideStage(current)) {
      const forward = stages
        .filter((s) => s.displayOrder > current.displayOrder && !this.isSideStage(s))
        .sort((a, b) => a.displayOrder - b.displayOrder)[0];
      if (forward) targets.push(forward.code);
    }

    const extras = (current.allowedNextStageCodes as string[] | null) ?? [];
    for (const code of extras) {
      if (!targets.includes(code) && stages.some((s) => s.code === code)) targets.push(code);
    }
    return targets;
  }

  async evaluateBlockers(tenantId: string, instanceId: string): Promise<TransitionBlocker[]> {
    const instance = await this.loadInstanceWithTemplate(tenantId, instanceId);
    const current = instance.template.stages.find((s) => s.code === instance.currentStageCode);
    if (!current) return [{ type: 'STAGE', detail: `Current stage ${instance.currentStageCode} is not defined in the template` }];

    const blockers: TransitionBlocker[] = [];

    const requiredDocs = (current.requiredDocumentTypes as string[] | null) ?? [];
    if (requiredDocs.length > 0 && instance.caseItem) {
      const docs = await this.prisma.caseDocument.findMany({
        where: { tenantId, serviceCaseItemId: instance.caseItem.id, documentType: { in: requiredDocs } },
      });
      for (const docType of requiredDocs) {
        const doc = docs.find((d) => d.documentType === docType && DOC_SATISFIED_STATUSES.includes(d.status));
        if (!doc) {
          const existing = docs.find((d) => d.documentType === docType);
          blockers.push({
            type: 'DOCUMENT',
            detail: `Required document ${docType} is ${existing ? existing.status : 'missing'} (must be VERIFIED)`,
          });
        }
      }
    }

    const openChecklist = await this.prisma.workflowChecklistItem.count({
      where: { workflowInstanceId: instanceId, stageCode: current.code, isRequired: true, isCompleted: false },
    });
    if (openChecklist > 0) {
      blockers.push({ type: 'CHECKLIST', detail: `${openChecklist} mandatory checklist item(s) are not completed` });
    }

    if (current.requiresApproval || current.requiresPayment) {
      const approvalType = current.requiresPayment ? 'PAYMENT' : 'STAGE';
      const approval = await this.prisma.workflowApproval.findFirst({
        where: { workflowInstanceId: instanceId, stageCode: current.code, status: 'APPROVED' },
      });
      if (!approval) {
        const pending = await this.prisma.workflowApproval.findFirst({
          where: { workflowInstanceId: instanceId, stageCode: current.code, status: 'PENDING' },
        });
        blockers.push({
          type: current.requiresPayment ? 'PAYMENT' : 'APPROVAL',
          detail: pending
            ? `${approvalType} approval for stage "${current.name}" is still pending`
            : `Stage "${current.name}" requires ${current.requiresPayment ? 'a payment/credit approval' : 'an approval'} before continuing`,
        });
      }
    }

    return blockers;
  }

  async getAvailableTransitions(tenantId: string, instanceId: string) {
    const instance = await this.loadInstanceWithTemplate(tenantId, instanceId);
    const blockers = await this.evaluateBlockers(tenantId, instanceId);
    const targets = this.allowedTargets(instance.template.stages, instance.currentStageCode);
    const currentStage = instance.template.stages.find((s) => s.code === instance.currentStageCode);

    return {
      instanceId,
      status: instance.status,
      currentStage: currentStage
        ? { code: currentStage.code, name: currentStage.name, group: currentStage.stageGroup, isTerminal: currentStage.isTerminal }
        : null,
      canTransition: blockers.length === 0 && targets.length > 0 && instance.status === 'ACTIVE',
      blockers,
      availableStages: targets.map((code) => {
        const stage = instance.template.stages.find((s) => s.code === code)!;
        return { code: stage.code, name: stage.name, group: stage.stageGroup, isTerminal: stage.isTerminal };
      }),
    };
  }

  async transition(tenantId: string, actorId: string, instanceId: string, toStageCode: string, reason?: string) {
    const instance = await this.loadInstanceWithTemplate(tenantId, instanceId);
    if (instance.status !== 'ACTIVE') {
      throw new BadRequestException(`Workflow is ${instance.status}; only ACTIVE workflows can transition`);
    }

    const stages = instance.template.stages;
    const currentStage = stages.find((s) => s.code === instance.currentStageCode);
    const targetStage = stages.find((s) => s.code === toStageCode);
    if (!targetStage) throw new BadRequestException(`Stage ${toStageCode} does not exist in this workflow`);

    const targets = this.allowedTargets(stages, instance.currentStageCode);
    if (!targets.includes(toStageCode)) {
      throw new BadRequestException(
        `TRANSITION_NOT_ALLOWED: cannot move from "${currentStage?.name ?? instance.currentStageCode}" to "${targetStage.name}". Allowed: ${targets.join(', ') || 'none'}`,
      );
    }

    const isForward = currentStage ? targetStage.displayOrder > currentStage.displayOrder : true;
    if (isForward) {
      const blockers = await this.evaluateBlockers(tenantId, instanceId);
      if (blockers.length > 0) {
        throw new BadRequestException(
          `TRANSITION_BLOCKED: cannot advance to "${targetStage.name}": ${blockers.map((b) => b.detail).join('; ')}`,
        );
      }
    }

    const now = new Date();
    const slaDueAt = targetStage.slaHours ? new Date(now.getTime() + targetStage.slaHours * 3600 * 1000) : null;

    const result = await this.prisma.$transaction(async (tx) => {
      const openStage = await tx.workflowStageInstance.findFirst({
        where: { workflowInstanceId: instanceId, completedAt: null },
        orderBy: { sequence: 'desc' },
      });
      if (openStage) {
        await tx.workflowStageInstance.update({
          where: { id: openStage.id },
          data: {
            completedAt: now,
            slaStatus: openStage.slaDueAt ? (now > openStage.slaDueAt ? 'BREACHED' : 'MET') : null,
          },
        });
      }

      const nextSequence = (openStage?.sequence ?? 0) + 1;
      await tx.workflowStageInstance.create({
        data: {
          tenantId,
          workflowInstanceId: instanceId,
          stageCode: targetStage.code,
          stageName: targetStage.name,
          stageGroup: targetStage.stageGroup,
          sequence: nextSequence,
          slaDueAt,
          enteredById: actorId,
        },
      });

      await this.seedChecklist(tx, tenantId, instanceId, targetStage);

      const updatedInstance = await tx.workflowInstance.update({
        where: { id: instanceId },
        data: {
          currentStageCode: targetStage.code,
          ...(targetStage.isTerminal && { status: 'COMPLETED', completedAt: now }),
        },
      });

      if (instance.caseItem) {
        await tx.serviceCaseItem.update({
          where: { id: instance.caseItem.id },
          data: {
            currentStageCode: targetStage.code,
            slaDueAt,
            slaStatus: slaDueAt ? 'ON_TRACK' : null,
            updatedById: actorId,
            ...(targetStage.isTerminal && { status: 'COMPLETED', completedAt: now }),
          },
        });
      }

      await tx.workflowStatusHistory.create({
        data: {
          tenantId,
          workflowInstanceId: instanceId,
          fromStageCode: instance.currentStageCode,
          toStageCode: targetStage.code,
          action: isForward ? 'TRANSITION' : 'REOPEN',
          reason,
          actorId,
        },
      });

      return updatedInstance;
    });

    const itemRef = instance.caseItem?.referenceNumber ?? instanceId;
    await this.activity.log(
      tenantId, actorId, 'WORKFLOW_STAGE_CHANGED',
      `${itemRef}: ${currentStage?.name ?? instance.currentStageCode} -> ${targetStage.name}`,
      'ServiceCaseItem', instance.caseItem?.id ?? instanceId, instance.caseItem?.branchId ?? undefined,
    );
    await this.audit.logMutation(actorId, tenantId, 'WORKFLOW', 'WorkflowInstance', instanceId, 'STATUS_CHANGE', {
      from: instance.currentStageCode,
      to: targetStage.code,
      reason,
      caseItemId: instance.caseItem?.id,
    });

    return { instanceId, currentStageCode: result.currentStageCode, status: result.status, slaDueAt };
  }

  // ─── Checklist / approvals ──────────────────────────────────

  async completeChecklistItem(tenantId: string, actorId: string, instanceId: string, checklistItemId: string, evidence?: string) {
    const item = await this.prisma.workflowChecklistItem.findFirst({
      where: { id: checklistItemId, workflowInstanceId: instanceId, tenantId },
    });
    if (!item) throw new NotFoundException('Checklist item not found');
    if (item.isCompleted) return item;

    const updated = await this.prisma.workflowChecklistItem.update({
      where: { id: item.id },
      data: { isCompleted: true, completedById: actorId, completedAt: new Date(), evidence },
    });
    await this.audit.logMutation(actorId, tenantId, 'WORKFLOW', 'WorkflowChecklistItem', item.id, 'UPDATE', {
      code: item.code, stageCode: item.stageCode, completed: true,
    });
    return updated;
  }

  async requestApproval(tenantId: string, actorId: string, instanceId: string, note?: string) {
    const instance = await this.loadInstanceWithTemplate(tenantId, instanceId);
    const currentStage = instance.template.stages.find((s) => s.code === instance.currentStageCode);
    if (!currentStage || (!currentStage.requiresApproval && !currentStage.requiresPayment)) {
      throw new BadRequestException('Current stage does not require an approval');
    }
    const existing = await this.prisma.workflowApproval.findFirst({
      where: { workflowInstanceId: instanceId, stageCode: instance.currentStageCode, status: { in: ['PENDING', 'APPROVED'] } },
    });
    if (existing) {
      if (existing.status === 'APPROVED') throw new BadRequestException('Stage is already approved');
      return existing;
    }
    const approval = await this.prisma.workflowApproval.create({
      data: {
        tenantId,
        workflowInstanceId: instanceId,
        stageCode: instance.currentStageCode,
        approvalType: currentStage.requiresPayment ? 'PAYMENT' : 'STAGE',
        requestedById: actorId,
        note,
      },
    });
    await this.activity.log(tenantId, actorId, 'WORKFLOW_APPROVAL_REQUESTED', `Approval requested for stage ${currentStage.name}`, 'WorkflowApproval', approval.id);
    return approval;
  }

  async decideApproval(tenantId: string, actorId: string, approvalId: string, decision: 'APPROVED' | 'REJECTED', note?: string) {
    const approval = await this.prisma.workflowApproval.findFirst({ where: { id: approvalId, tenantId } });
    if (!approval) throw new NotFoundException('Approval not found');
    if (approval.status !== 'PENDING') {
      throw new BadRequestException(`Approval is already ${approval.status}`);
    }
    if (approval.requestedById && approval.requestedById === actorId) {
      throw new BadRequestException('SOD_VIOLATION: the requester of an approval cannot decide it');
    }
    if (decision === 'REJECTED' && !note) {
      throw new BadRequestException('Rejecting an approval requires a note');
    }

    const updated = await this.prisma.workflowApproval.update({
      where: { id: approval.id },
      data: { status: decision, decidedById: actorId, decidedAt: new Date(), ...(note !== undefined && { note }) },
    });
    await this.audit.logMutation(actorId, tenantId, 'WORKFLOW_APPROVAL', 'WorkflowApproval', approval.id, decision === 'APPROVED' ? 'APPROVE' : 'REJECT', {
      stageCode: approval.stageCode, approvalType: approval.approvalType, note,
    });
    return updated;
  }

  async getTimeline(tenantId: string, instanceId: string) {
    const instance = await this.loadInstanceWithTemplate(tenantId, instanceId);
    const [stageInstances, history, checklist, approvals] = await Promise.all([
      this.prisma.workflowStageInstance.findMany({ where: { workflowInstanceId: instanceId }, orderBy: { sequence: 'asc' } }),
      this.prisma.workflowStatusHistory.findMany({ where: { workflowInstanceId: instanceId }, orderBy: { createdAt: 'asc' } }),
      this.prisma.workflowChecklistItem.findMany({ where: { workflowInstanceId: instanceId }, orderBy: [{ stageCode: 'asc' }, { sortOrder: 'asc' }] }),
      this.prisma.workflowApproval.findMany({ where: { workflowInstanceId: instanceId }, orderBy: { requestedAt: 'asc' } }),
    ]);

    const visited = new Map(stageInstances.map((s) => [s.stageCode, s]));
    const stages = instance.template.stages.map((s) => {
      const visit = visited.get(s.code);
      return {
        code: s.code,
        name: s.name,
        group: s.stageGroup,
        displayOrder: s.displayOrder,
        isTerminal: s.isTerminal,
        state: s.code === instance.currentStageCode && instance.status === 'ACTIVE'
          ? 'CURRENT'
          : visit?.completedAt || (visit && instance.status === 'COMPLETED')
            ? 'COMPLETED'
            : visit
              ? 'CURRENT'
              : 'UPCOMING',
        enteredAt: visit?.enteredAt ?? null,
        completedAt: visit?.completedAt ?? null,
        slaDueAt: visit?.slaDueAt ?? null,
        slaStatus: visit?.slaStatus ?? (visit?.slaDueAt && !visit.completedAt && new Date() > visit.slaDueAt ? 'BREACHED' : null),
      };
    });

    return {
      instanceId,
      status: instance.status,
      currentStageCode: instance.currentStageCode,
      templateCode: instance.template.code,
      templateVersion: instance.templateVersion,
      stages,
      history,
      checklist,
      approvals,
    };
  }
}
