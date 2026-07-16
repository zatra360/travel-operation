import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ActivityService } from '../activity/activity.service';
import { ServiceTypeService } from './service-type.service';
import { WorkflowEngineService } from './workflow-engine.service';
import { SYSTEM_WORKFLOW_TEMPLATES } from './templates/system-templates';
import { CreateServiceCaseDto, AddServiceItemDto, QueryServiceCaseDto, CloseCaseDto, ReopenCaseDto, AssignDto } from './dto/service-case.dto';

const round4 = (n: number) => Math.round(n * 10000) / 10000;

@Injectable()
export class ServiceCaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly activity: ActivityService,
    private readonly serviceTypes: ServiceTypeService,
    private readonly engine: WorkflowEngineService,
  ) {}

  private async allocateNumber(db: Prisma.TransactionClient, tenantId: string, documentType: string, series: string, prefix: string, actorId: string, recordType: string, recordId: string): Promise<string> {
    const fiscalYearCode = String(new Date().getFullYear());
    const rows = await db.$queryRaw<Array<{ n: string }>>`
      SELECT fn_allocate_document_number(
        ${tenantId}, ${documentType}, ${fiscalYearCode}, ${series}, ${prefix}, 6,
        ${recordType}, ${recordId}, ${actorId}
      ) AS n`;
    return rows[0].n;
  }

  async ensureFoundation() {
    await this.serviceTypes.ensureSystemTypes();
    await this.engine.ensureAllSystemTemplates();
  }

  // ─── Creation ───────────────────────────────────────────────

  async create(tenantId: string, actorId: string, branchId: string | undefined, dto: CreateServiceCaseDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('A service case requires at least one service item');
    }
    await this.ensureFoundation();

    if (dto.clientId) {
      const client = await this.prisma.client.findFirst({ where: { id: dto.clientId, tenantId, deletedAt: null } });
      if (!client) throw new BadRequestException('Client does not belong to this tenant');
    }
    if (dto.leadId) {
      const lead = await this.prisma.lead.findFirst({ where: { id: dto.leadId, tenantId, deletedAt: null } });
      if (!lead) throw new BadRequestException('Lead does not belong to this tenant');
    }
    if (dto.teamId) {
      const team = await this.prisma.team.findFirst({ where: { id: dto.teamId, tenantId } });
      if (!team) throw new BadRequestException('Team does not belong to this tenant');
    }

    const resolvedItems: Array<{ typeId: string; systemCode: string; templateId: string; dto: AddServiceItemDto }> = [];
    for (const item of dto.items) {
      const { type, config } = await this.serviceTypes.resolveEnabledType(tenantId, item.serviceTypeCode);
      const template = await this.engine.resolveTemplate(tenantId, type.id, config?.defaultWorkflowTemplateId);
      if (!template) {
        const hasSystemDef = SYSTEM_WORKFLOW_TEMPLATES.some((t) => t.serviceTypeCode === item.serviceTypeCode);
        if (!hasSystemDef) {
          throw new BadRequestException(
            `No published workflow template exists for service type ${item.serviceTypeCode}; create and publish one first`,
          );
        }
      }
      resolvedItems.push({ typeId: type.id, systemCode: type.systemCode, templateId: template!.id, dto: item });
    }

    const serviceCase = await this.prisma.$transaction(async (tx) => {
      const created = await tx.serviceCase.create({
        data: {
          tenantId,
          branchId: dto.branchId ?? branchId ?? null,
          caseNumber: 'PENDING',
          leadId: dto.leadId,
          clientId: dto.clientId,
          title: dto.title,
          priority: dto.priority ?? 'MEDIUM',
          assignedToId: dto.assignedToId ?? actorId,
          ownerId: dto.ownerId ?? actorId,
          teamId: dto.teamId,
          source: dto.source,
          currencyCode: dto.currencyCode ?? 'USD',
          dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
          metadata: (dto.metadata ?? {}) as any,
          createdById: actorId,
        },
      });

      const caseNumber = await this.allocateNumber(tx, tenantId, 'SERVICE_CASE', 'DEFAULT', 'CASE', actorId, 'ServiceCase', created.id);
      await tx.serviceCase.update({ where: { id: created.id }, data: { caseNumber } });

      let expectedRevenue = 0;
      for (const resolved of resolvedItems) {
        const item = await this.createItemInTx(tx, tenantId, actorId, created.id, created.branchId, resolved);
        expectedRevenue += Number(item.serviceAmount);
      }

      await tx.serviceCase.update({
        where: { id: created.id },
        data: { expectedRevenue: round4(expectedRevenue), status: 'IN_PROGRESS' },
      });

      return created.id;
    });

    const full = await this.findById(tenantId, serviceCase);
    await this.activity.log(tenantId, actorId, 'SERVICE_CASE_CREATED', `Service case ${full.caseNumber} created (${full.items.length} item(s))`, 'ServiceCase', full.id, full.branchId ?? undefined);
    await this.audit.logMutation(actorId, tenantId, 'SERVICE_CASE', 'ServiceCase', full.id, 'CREATE', {
      caseNumber: full.caseNumber,
      items: full.items.map((i) => i.referenceNumber),
    });
    return full;
  }

  private async createItemInTx(
    tx: Prisma.TransactionClient,
    tenantId: string,
    actorId: string,
    serviceCaseId: string,
    branchId: string | null,
    resolved: { typeId: string; systemCode: string; templateId: string; dto: AddServiceItemDto },
  ) {
    const item = await tx.serviceCaseItem.create({
      data: {
        tenantId,
        branchId,
        serviceCaseId,
        serviceTypeId: resolved.typeId,
        referenceNumber: 'PENDING',
        priority: resolved.dto.priority ?? 'MEDIUM',
        assignedToId: resolved.dto.assignedToId ?? actorId,
        supplierId: resolved.dto.supplierId,
        startDate: resolved.dto.startDate ? new Date(resolved.dto.startDate) : new Date(),
        targetCompletionDate: resolved.dto.targetCompletionDate ? new Date(resolved.dto.targetCompletionDate) : null,
        serviceAmount: resolved.dto.serviceAmount ?? 0,
        supplierCost: resolved.dto.supplierCost ?? 0,
        grossProfit: round4((resolved.dto.serviceAmount ?? 0) - (resolved.dto.supplierCost ?? 0)),
        currencyCode: resolved.dto.currencyCode ?? 'USD',
        metadata: (resolved.dto.metadata ?? {}) as any,
        createdById: actorId,
      },
    });

    const referenceNumber = await this.allocateNumber(
      tx, tenantId, 'SERVICE_CASE_ITEM', resolved.systemCode, resolved.systemCode, actorId, 'ServiceCaseItem', item.id,
    );

    const workflow = await this.engine.startInstance(tx, tenantId, actorId, resolved.templateId);

    return tx.serviceCaseItem.update({
      where: { id: item.id },
      data: {
        referenceNumber,
        workflowInstanceId: workflow.instanceId,
        currentStageCode: workflow.initialStageCode,
        slaDueAt: workflow.slaDueAt,
        slaStatus: workflow.slaDueAt ? 'ON_TRACK' : null,
      },
    });
  }

  async addItem(tenantId: string, actorId: string, caseId: string, dto: AddServiceItemDto) {
    const serviceCase = await this.findById(tenantId, caseId);
    if (['CLOSED', 'CANCELLED'].includes(serviceCase.status)) {
      throw new BadRequestException(`Cannot add items to a ${serviceCase.status} case`);
    }
    await this.ensureFoundation();
    const { type, config } = await this.serviceTypes.resolveEnabledType(tenantId, dto.serviceTypeCode);
    const template = await this.engine.resolveTemplate(tenantId, type.id, config?.defaultWorkflowTemplateId);
    if (!template) throw new BadRequestException(`No published workflow template for ${dto.serviceTypeCode}`);

    const item = await this.prisma.$transaction((tx) =>
      this.createItemInTx(tx, tenantId, actorId, caseId, serviceCase.branchId, {
        typeId: type.id, systemCode: type.systemCode, templateId: template.id, dto,
      }),
    );

    await this.recalculateExpectedRevenue(tenantId, caseId);
    await this.activity.log(tenantId, actorId, 'SERVICE_ITEM_CREATED', `Service item ${item.referenceNumber} added to ${serviceCase.caseNumber}`, 'ServiceCaseItem', item.id, serviceCase.branchId ?? undefined);
    await this.audit.logMutation(actorId, tenantId, 'SERVICE_ITEM', 'ServiceCaseItem', item.id, 'CREATE', { referenceNumber: item.referenceNumber });
    return item;
  }

  private async recalculateExpectedRevenue(tenantId: string, caseId: string) {
    const agg = await this.prisma.serviceCaseItem.aggregate({
      where: { tenantId, serviceCaseId: caseId, deletedAt: null, status: { not: 'CANCELLED' } },
      _sum: { serviceAmount: true },
    });
    await this.prisma.serviceCase.update({
      where: { id: caseId },
      data: { expectedRevenue: agg._sum.serviceAmount ?? 0 },
    });
  }

  // ─── Queries ────────────────────────────────────────────────

  async findAll(tenantId: string, query: QueryServiceCaseDto, activeBranchId?: string) {
    const page = Number(query.page ?? 1);
    const limit = Math.min(Number(query.limit ?? 25), 100);
    const skip = (page - 1) * limit;
    const where: any = { tenantId, deletedAt: null };
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.assignedToId) where.assignedToId = query.assignedToId;
    if (query.teamId) where.teamId = query.teamId;
    if (query.clientId) where.clientId = query.clientId;
    if (query.serviceTypeCode) {
      where.items = { some: { serviceType: { systemCode: query.serviceTypeCode }, deletedAt: null } };
    }
    if (query.search) {
      where.OR = [
        { caseNumber: { contains: query.search, mode: 'insensitive' } },
        { title: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (activeBranchId) where.branchId = activeBranchId;

    const [data, total] = await Promise.all([
      this.prisma.serviceCase.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          items: {
            where: { deletedAt: null },
            select: {
              id: true, referenceNumber: true, status: true, currentStageCode: true,
              slaDueAt: true, slaStatus: true, serviceAmount: true,
              serviceType: { select: { systemCode: true, displayName: true, icon: true } },
            },
          },
        },
      }),
      this.prisma.serviceCase.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(tenantId: string, id: string) {
    const serviceCase = await this.prisma.serviceCase.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        team: { select: { id: true, name: true, code: true } },
        items: {
          where: { deletedAt: null },
          include: {
            serviceType: { select: { systemCode: true, displayName: true, icon: true, category: true } },
            documents: { orderBy: { createdAt: 'asc' } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!serviceCase) throw new NotFoundException('Service case not found');
    return serviceCase;
  }

  async getItem(tenantId: string, itemId: string) {
    const item = await this.prisma.serviceCaseItem.findFirst({
      where: { id: itemId, tenantId, deletedAt: null },
      include: {
        serviceType: { select: { systemCode: true, displayName: true, icon: true } },
        serviceCase: { select: { id: true, caseNumber: true, title: true, status: true, clientId: true } },
        documents: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!item) throw new NotFoundException('Service case item not found');
    return item;
  }

  async financialSummary(tenantId: string, caseId: string) {
    await this.findById(tenantId, caseId);
    const items = await this.prisma.serviceCaseItem.findMany({
      where: { tenantId, serviceCaseId: caseId, deletedAt: null },
      select: {
        referenceNumber: true, status: true, currencyCode: true,
        serviceAmount: true, supplierCost: true, taxAmount: true, discountAmount: true, grossProfit: true,
        serviceType: { select: { systemCode: true, displayName: true } },
      },
    });
    const totals = items.reduce(
      (t, i) => ({
        serviceAmount: round4(t.serviceAmount + Number(i.serviceAmount)),
        supplierCost: round4(t.supplierCost + Number(i.supplierCost)),
        taxAmount: round4(t.taxAmount + Number(i.taxAmount)),
        discountAmount: round4(t.discountAmount + Number(i.discountAmount)),
        grossProfit: round4(t.grossProfit + Number(i.grossProfit)),
      }),
      { serviceAmount: 0, supplierCost: 0, taxAmount: 0, discountAmount: 0, grossProfit: 0 },
    );
    return { items, totals };
  }

  async getCaseTimeline(tenantId: string, caseId: string) {
    const serviceCase = await this.findById(tenantId, caseId);
    const itemIds = serviceCase.items.map((i) => i.id);
    return this.prisma.activity.findMany({
      where: {
        tenantId,
        OR: [
          { entity: 'ServiceCase', entityId: caseId },
          { entity: 'ServiceCaseItem', entityId: { in: itemIds } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  // ─── Assignment / closure ───────────────────────────────────

  async assign(tenantId: string, actorId: string, caseId: string, dto: AssignDto) {
    const serviceCase = await this.findById(tenantId, caseId);
    if (dto.teamId) {
      const team = await this.prisma.team.findFirst({ where: { id: dto.teamId, tenantId } });
      if (!team) throw new BadRequestException('Team does not belong to this tenant');
    }
    const updated = await this.prisma.serviceCase.update({
      where: { id: caseId },
      data: {
        ...(dto.assignedToId !== undefined && { assignedToId: dto.assignedToId }),
        ...(dto.teamId !== undefined && { teamId: dto.teamId }),
        updatedById: actorId,
      },
    });
    await this.audit.logMutation(actorId, tenantId, 'SERVICE_CASE', 'ServiceCase', caseId, 'UPDATE', {
      caseNumber: serviceCase.caseNumber,
      assignment: { assignedToId: dto.assignedToId, teamId: dto.teamId },
    });
    await this.activity.log(tenantId, actorId, 'SERVICE_CASE_ASSIGNED', `Case ${serviceCase.caseNumber} reassigned`, 'ServiceCase', caseId, serviceCase.branchId ?? undefined);
    return updated;
  }

  async close(tenantId: string, actorId: string, caseId: string, dto: CloseCaseDto) {
    const serviceCase = await this.findById(tenantId, caseId);
    if (serviceCase.status === 'CLOSED') throw new BadRequestException('Case is already closed');

    const activeItems = serviceCase.items.filter((i) => !['COMPLETED', 'CANCELLED'].includes(i.status));
    if (activeItems.length > 0 && !dto.force) {
      throw new BadRequestException(
        `CASE_CLOSE_BLOCKED: ${activeItems.length} service item(s) are still active (${activeItems.map((i) => i.referenceNumber).join(', ')}). Complete or cancel them, or pass force=true with a reason.`,
      );
    }
    if (activeItems.length > 0 && !dto.reason) {
      throw new BadRequestException('Force-closing a case with active items requires a reason');
    }

    const now = new Date();
    const updated = await this.prisma.serviceCase.update({
      where: { id: caseId },
      data: {
        status: 'CLOSED',
        closedAt: now,
        completedAt: serviceCase.completedAt ?? now,
        closureReason: dto.reason,
        updatedById: actorId,
      },
    });
    await this.audit.logMutation(actorId, tenantId, 'SERVICE_CASE', 'ServiceCase', caseId, 'STATUS_CHANGE', {
      caseNumber: serviceCase.caseNumber,
      to: 'CLOSED',
      reason: dto.reason,
      forcedWithActiveItems: activeItems.map((i) => i.referenceNumber),
    });
    await this.activity.log(tenantId, actorId, 'SERVICE_CASE_CLOSED', `Case ${serviceCase.caseNumber} closed`, 'ServiceCase', caseId, serviceCase.branchId ?? undefined);
    return updated;
  }

  async reopen(tenantId: string, actorId: string, caseId: string, dto: ReopenCaseDto) {
    const serviceCase = await this.findById(tenantId, caseId);
    if (serviceCase.status !== 'CLOSED' && serviceCase.status !== 'CANCELLED') {
      throw new BadRequestException('Only closed or cancelled cases can be reopened');
    }
    const updated = await this.prisma.serviceCase.update({
      where: { id: caseId },
      data: {
        status: 'IN_PROGRESS',
        closedAt: null,
        closureReason: null,
        reopenedAt: new Date(),
        reopenReason: dto.reason,
        updatedById: actorId,
      },
    });
    await this.audit.logMutation(actorId, tenantId, 'SERVICE_CASE', 'ServiceCase', caseId, 'STATUS_CHANGE', {
      caseNumber: serviceCase.caseNumber,
      to: 'IN_PROGRESS',
      action: 'REOPEN',
      reason: dto.reason,
    });
    await this.activity.log(tenantId, actorId, 'SERVICE_CASE_REOPENED', `Case ${serviceCase.caseNumber} reopened`, 'ServiceCase', caseId, serviceCase.branchId ?? undefined);
    return updated;
  }

  async cancelItem(tenantId: string, actorId: string, itemId: string, reason: string) {
    const item = await this.getItem(tenantId, itemId);
    if (item.status === 'COMPLETED') throw new BadRequestException('Completed items cannot be cancelled');
    if (item.status === 'CANCELLED') throw new BadRequestException('Item is already cancelled');
    if (!reason) throw new BadRequestException('Cancelling a service item requires a reason');

    const updated = await this.prisma.$transaction(async (tx) => {
      if (item.workflowInstanceId) {
        await tx.workflowInstance.update({
          where: { id: item.workflowInstanceId },
          data: { status: 'CANCELLED', cancelledAt: new Date() },
        });
        await tx.workflowStatusHistory.create({
          data: {
            tenantId,
            workflowInstanceId: item.workflowInstanceId,
            fromStageCode: item.currentStageCode,
            toStageCode: item.currentStageCode ?? 'CANCELLED',
            action: 'CANCEL',
            reason,
            actorId,
          },
        });
      }
      return tx.serviceCaseItem.update({
        where: { id: itemId },
        data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason, updatedById: actorId },
      });
    });

    await this.recalculateExpectedRevenue(tenantId, item.serviceCaseId);
    await this.audit.logMutation(actorId, tenantId, 'SERVICE_ITEM', 'ServiceCaseItem', itemId, 'STATUS_CHANGE', {
      referenceNumber: item.referenceNumber, to: 'CANCELLED', reason,
    });
    await this.activity.log(tenantId, actorId, 'SERVICE_ITEM_CANCELLED', `Service item ${item.referenceNumber} cancelled`, 'ServiceCaseItem', itemId, item.branchId ?? undefined);
    return updated;
  }
}
