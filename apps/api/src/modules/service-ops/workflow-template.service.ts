import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

export interface StageInput {
  code: string;
  name: string;
  stageGroup?: string;
  slaHours?: number | null;
  requiredDocumentTypes?: string[];
  requiredChecklist?: Array<{ code: string; title: string }>;
  requiresApproval?: boolean;
  requiresPayment?: boolean;
  isInitial?: boolean;
  isTerminal?: boolean;
  isSideStage?: boolean;
  extraNextStageCodes?: string[];
}

const STAGE_GROUPS = ['INTAKE', 'QUALIFICATION', 'QUOTATION', 'DOCUMENTATION', 'PROCESSING', 'APPROVAL', 'BOOKING', 'PAYMENT', 'DELIVERY', 'AFTER_SALES', 'CLOSURE'];

/**
 * Tenant workflow-template management. System templates are immutable
 * (clone to customize); published tenant templates are immutable too —
 * cloning creates the next editable draft. Publishing assigns a version
 * higher than every existing template of the service type so new cases
 * pick the tenant customization while running instances stay pinned.
 */
@Injectable()
export class WorkflowTemplateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(tenantId: string, serviceTypeCode?: string) {
    const where: Prisma.WorkflowTemplateWhereInput = {
      OR: [{ tenantId }, { tenantId: null, isSystem: true }],
      ...(serviceTypeCode && { serviceType: { systemCode: serviceTypeCode } }),
    };
    const templates = await this.prisma.workflowTemplate.findMany({
      where,
      include: {
        serviceType: { select: { systemCode: true, displayName: true, icon: true } },
        stages: { orderBy: { displayOrder: 'asc' } },
        _count: { select: { instances: true } },
      },
      orderBy: [{ serviceTypeId: 'asc' }, { version: 'desc' }],
    });
    return templates.map((t) => ({
      id: t.id,
      code: t.code,
      name: t.name,
      description: t.description,
      version: t.version,
      status: t.status,
      isSystem: t.isSystem,
      publishedAt: t.publishedAt,
      serviceType: t.serviceType,
      stageCount: t.stages.length,
      instanceCount: t._count.instances,
      stages: t.stages.map((s) => ({
        code: s.code,
        name: s.name,
        stageGroup: s.stageGroup,
        displayOrder: s.displayOrder,
        slaHours: s.slaHours,
        requiresApproval: s.requiresApproval,
        requiresPayment: s.requiresPayment,
        requiredDocumentTypes: s.requiredDocumentTypes,
        requiredChecklist: s.requiredChecklist,
        allowedNextStageCodes: s.allowedNextStageCodes,
        isInitial: s.isInitial,
        isTerminal: s.isTerminal,
        isSideStage: Boolean((s.metadata as { isSideStage?: boolean } | null)?.isSideStage),
      })),
    }));
  }

  private async loadOwned(tenantId: string, id: string) {
    const template = await this.prisma.workflowTemplate.findFirst({
      where: { id, OR: [{ tenantId }, { tenantId: null, isSystem: true }] },
      include: { stages: { orderBy: { displayOrder: 'asc' } }, serviceType: true },
    });
    if (!template) throw new NotFoundException('Workflow template not found');
    return template;
  }

  /** Clones any visible template into an editable tenant DRAFT. */
  async clone(tenantId: string, actorId: string, sourceId: string, name?: string) {
    const source = await this.loadOwned(tenantId, sourceId);

    const draft = await this.prisma.workflowTemplate.create({
      data: {
        tenantId,
        serviceTypeId: source.serviceTypeId,
        code: `${source.serviceType.systemCode}_CUSTOM`,
        name: name?.trim() || `${source.name} (customized)`,
        description: `Customized from ${source.code} v${source.version}`,
        version: 0,
        status: 'DRAFT',
        isSystem: false,
        createdById: actorId,
      },
    });
    for (const stage of source.stages) {
      await this.prisma.workflowStageTemplate.create({
        data: {
          templateId: draft.id,
          code: stage.code,
          name: stage.name,
          description: stage.description,
          displayOrder: stage.displayOrder,
          stageGroup: stage.stageGroup,
          responsibleRole: stage.responsibleRole,
          slaHours: stage.slaHours,
          isInitial: stage.isInitial,
          isTerminal: stage.isTerminal,
          requiredDocumentTypes: stage.requiredDocumentTypes ?? undefined,
          requiredChecklist: stage.requiredChecklist ?? undefined,
          requiresApproval: stage.requiresApproval,
          requiresPayment: stage.requiresPayment,
          allowedNextStageCodes: stage.allowedNextStageCodes ?? undefined,
          metadata: stage.metadata ?? undefined,
        },
      });
    }

    await this.audit.logMutation(actorId, tenantId, 'WORKFLOW', 'WorkflowTemplate', draft.id, 'CREATE', {
      clonedFrom: source.code, sourceVersion: source.version,
    });
    return this.loadOwned(tenantId, draft.id);
  }

  validateStages(stages: StageInput[]): string[] {
    const errors: string[] = [];
    if (stages.length < 2) errors.push('A workflow needs at least two stages');

    const codes = stages.map((s) => s.code?.trim().toUpperCase()).filter(Boolean);
    if (codes.length !== stages.length) errors.push('Every stage needs a code');
    if (new Set(codes).size !== codes.length) errors.push('Stage codes must be unique');

    const initials = stages.filter((s) => s.isInitial);
    if (initials.length > 1) errors.push('Only one stage can be the initial stage');
    const terminals = stages.filter((s) => s.isTerminal);
    if (terminals.length === 0) errors.push('At least one stage must be terminal (closure)');

    for (const stage of stages) {
      if (!stage.name?.trim()) errors.push(`Stage ${stage.code}: name is required`);
      if (stage.stageGroup && !STAGE_GROUPS.includes(stage.stageGroup)) {
        errors.push(`Stage ${stage.code}: unknown group ${stage.stageGroup}`);
      }
      if (stage.slaHours !== undefined && stage.slaHours !== null && stage.slaHours <= 0) {
        errors.push(`Stage ${stage.code}: SLA hours must be positive`);
      }
      for (const next of stage.extraNextStageCodes ?? []) {
        if (!codes.includes(next.trim().toUpperCase())) {
          errors.push(`Stage ${stage.code}: extra transition target ${next} does not exist`);
        }
      }
      if (stage.isSideStage && (stage.extraNextStageCodes ?? []).length === 0) {
        errors.push(`Stage ${stage.code}: side stages need at least one explicit transition target`);
      }
    }
    return errors;
  }

  /** Replaces the stage list of a tenant DRAFT template. */
  async updateDraft(tenantId: string, actorId: string, id: string, dto: { name?: string; description?: string; stages?: StageInput[] }) {
    const template = await this.loadOwned(tenantId, id);
    if (template.isSystem || template.tenantId !== tenantId) {
      throw new BadRequestException('System templates are immutable — clone them to customize');
    }
    if (template.status !== 'DRAFT') {
      throw new BadRequestException(`Only DRAFT templates can be edited (current: ${template.status}); clone to create a new draft`);
    }

    if (dto.stages) {
      const errors = this.validateStages(dto.stages);
      if (errors.length > 0) {
        throw new BadRequestException(`TEMPLATE_INVALID: ${errors.join('; ')}`);
      }
      await this.prisma.workflowStageTemplate.deleteMany({ where: { templateId: id } });
      let order = 1;
      for (const stage of dto.stages) {
        await this.prisma.workflowStageTemplate.create({
          data: {
            templateId: id,
            code: stage.code.trim().toUpperCase(),
            name: stage.name.trim(),
            displayOrder: order++,
            stageGroup: stage.stageGroup ?? 'PROCESSING',
            slaHours: stage.slaHours ?? null,
            isInitial: stage.isInitial ?? false,
            isTerminal: stage.isTerminal ?? false,
            requiredDocumentTypes: stage.requiredDocumentTypes?.length ? stage.requiredDocumentTypes : undefined,
            requiredChecklist: stage.requiredChecklist?.length ? stage.requiredChecklist : undefined,
            requiresApproval: stage.requiresApproval ?? false,
            requiresPayment: stage.requiresPayment ?? false,
            allowedNextStageCodes: stage.extraNextStageCodes?.length ? stage.extraNextStageCodes.map((c) => c.trim().toUpperCase()) : undefined,
            metadata: stage.isSideStage ? { isSideStage: true } : undefined,
          },
        });
      }
    }

    await this.prisma.workflowTemplate.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });

    await this.audit.logMutation(actorId, tenantId, 'WORKFLOW', 'WorkflowTemplate', id, 'UPDATE', {
      stagesReplaced: dto.stages?.length,
    });
    return this.loadOwned(tenantId, id);
  }

  async publish(tenantId: string, actorId: string, id: string) {
    const template = await this.loadOwned(tenantId, id);
    if (template.isSystem || template.tenantId !== tenantId) {
      throw new BadRequestException('System templates are managed by the platform');
    }
    if (template.status !== 'DRAFT') {
      throw new BadRequestException(`Template is already ${template.status}`);
    }

    const errors = this.validateStages(
      template.stages.map((s) => ({
        code: s.code,
        name: s.name,
        stageGroup: s.stageGroup,
        slaHours: s.slaHours,
        isInitial: s.isInitial,
        isTerminal: s.isTerminal,
        isSideStage: Boolean((s.metadata as { isSideStage?: boolean } | null)?.isSideStage),
        extraNextStageCodes: (s.allowedNextStageCodes as string[] | null) ?? [],
      })),
    );
    if (errors.length > 0) {
      throw new BadRequestException(`TEMPLATE_INVALID: ${errors.join('; ')}`);
    }

    const maxVersion = await this.prisma.workflowTemplate.aggregate({
      where: { serviceTypeId: template.serviceTypeId, OR: [{ tenantId }, { tenantId: null, isSystem: true }] },
      _max: { version: true },
    });

    const published = await this.prisma.workflowTemplate.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        version: (maxVersion._max.version ?? 0) + 1,
        publishedAt: new Date(),
      },
    });

    await this.audit.logMutation(actorId, tenantId, 'WORKFLOW', 'WorkflowTemplate', id, 'STATUS_CHANGE', {
      to: 'PUBLISHED', version: published.version, serviceType: template.serviceType.systemCode,
    });
    return published;
  }

  async archive(tenantId: string, actorId: string, id: string) {
    const template = await this.loadOwned(tenantId, id);
    if (template.isSystem || template.tenantId !== tenantId) {
      throw new BadRequestException('System templates cannot be archived');
    }
    if (template.status === 'ARCHIVED') return template;

    const archived = await this.prisma.workflowTemplate.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
    await this.audit.logMutation(actorId, tenantId, 'WORKFLOW', 'WorkflowTemplate', id, 'STATUS_CHANGE', { to: 'ARCHIVED' });
    return archived;
  }

  async removeDraft(tenantId: string, actorId: string, id: string) {
    const template = await this.loadOwned(tenantId, id);
    if (template.isSystem || template.tenantId !== tenantId || template.status !== 'DRAFT') {
      throw new BadRequestException('Only tenant DRAFT templates can be deleted');
    }
    await this.prisma.workflowTemplate.delete({ where: { id } });
    await this.audit.logMutation(actorId, tenantId, 'WORKFLOW', 'WorkflowTemplate', id, 'DELETE', { code: template.code });
    return { deleted: true };
  }
}
