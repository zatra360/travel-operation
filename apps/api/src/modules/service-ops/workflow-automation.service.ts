import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ActivityService } from '../activity/activity.service';
import { NotificationService } from '../notification/notification.service';

const TTL_ALERT_WINDOW_HOURS = 24;
const SLA_WARNING_WINDOW_HOURS = 4;

/**
 * Deterministic automation scans (Phase 7): SLA warnings/breaches and
 * ticketing-time-limit alerts create auditable WorkflowTasks and
 * notifications. Designed to be invoked by a scheduler (cron) or the
 * manual scan endpoint; every run is idempotent — existing open
 * automation tasks are never duplicated.
 */
@Injectable()
export class WorkflowAutomationService {
  private readonly logger = new Logger(WorkflowAutomationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly activity: ActivityService,
    private readonly notification: NotificationService,
  ) {}

  private async createTaskOnce(params: {
    tenantId: string;
    itemId: string;
    workflowInstanceId?: string | null;
    stageCode?: string | null;
    assignedToId?: string | null;
    dedupeTitle: string;
    description: string;
    priority?: string;
    dueAt?: Date | null;
  }): Promise<boolean> {
    const existing = await this.prisma.workflowTask.findFirst({
      where: {
        tenantId: params.tenantId,
        serviceCaseItemId: params.itemId,
        title: params.dedupeTitle,
        source: 'AUTOMATION',
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
      select: { id: true },
    });
    if (existing) return false;

    await this.prisma.workflowTask.create({
      data: {
        tenantId: params.tenantId,
        serviceCaseItemId: params.itemId,
        workflowInstanceId: params.workflowInstanceId,
        stageCode: params.stageCode,
        title: params.dedupeTitle,
        description: params.description,
        priority: params.priority ?? 'HIGH',
        assignedToId: params.assignedToId,
        dueAt: params.dueAt,
        source: 'AUTOMATION',
      },
    });

    if (params.assignedToId) {
      await this.notification
        .notify({
          tenantId: params.tenantId,
          userId: params.assignedToId,
          title: params.dedupeTitle,
          body: params.description,
        })
        .catch(() => {});
    }
    return true;
  }

  async runScans(tenantId: string, actorId: string) {
    const now = new Date();
    let breached = 0;
    let warnings = 0;
    let ttlAlerts = 0;
    let tasksCreated = 0;

    // 1. SLA breaches: mark and raise a task per newly breached item.
    const breachedItems = await this.prisma.serviceCaseItem.findMany({
      where: { tenantId, deletedAt: null, status: 'ACTIVE', slaDueAt: { lt: now } },
      select: {
        id: true, referenceNumber: true, currentStageCode: true, slaDueAt: true, slaStatus: true,
        assignedToId: true, workflowInstanceId: true, branchId: true,
        serviceType: { select: { displayName: true } },
      },
      take: 500,
    });
    for (const item of breachedItems) {
      if (item.slaStatus !== 'BREACHED') {
        await this.prisma.serviceCaseItem.update({ where: { id: item.id }, data: { slaStatus: 'BREACHED' } });
        await this.activity.log(
          tenantId, actorId, 'SLA_BREACHED',
          `${item.referenceNumber} breached its SLA at stage ${item.currentStageCode ?? 'unknown'}`,
          'ServiceCaseItem', item.id, item.branchId ?? undefined,
        );
        breached += 1;
      }
      const created = await this.createTaskOnce({
        tenantId,
        itemId: item.id,
        workflowInstanceId: item.workflowInstanceId,
        stageCode: item.currentStageCode,
        assignedToId: item.assignedToId,
        dedupeTitle: `SLA breached: ${item.referenceNumber}`,
        description: `${item.serviceType.displayName} item ${item.referenceNumber} exceeded its SLA (due ${item.slaDueAt?.toISOString()}) at stage ${item.currentStageCode ?? 'unknown'}. Escalate or progress the workflow.`,
        priority: 'URGENT',
      });
      if (created) tasksCreated += 1;
    }

    // 2. SLA warnings: items due within the warning window.
    const warningItems = await this.prisma.serviceCaseItem.findMany({
      where: {
        tenantId, deletedAt: null, status: 'ACTIVE',
        slaDueAt: { gte: now, lte: new Date(now.getTime() + SLA_WARNING_WINDOW_HOURS * 3600 * 1000) },
        slaStatus: { notIn: ['WARNING', 'BREACHED'] },
      },
      select: { id: true },
      take: 500,
    });
    if (warningItems.length > 0) {
      await this.prisma.serviceCaseItem.updateMany({
        where: { id: { in: warningItems.map((i) => i.id) } },
        data: { slaStatus: 'WARNING' },
      });
      warnings = warningItems.length;
    }

    // 3. Ticketing-time-limit alerts (captured on booking linkage).
    const ttlCandidates = await this.prisma.serviceCaseItem.findMany({
      where: { tenantId, deletedAt: null, status: 'ACTIVE', bookingId: { not: null } },
      select: {
        id: true, referenceNumber: true, metadata: true, assignedToId: true,
        workflowInstanceId: true, currentStageCode: true,
        serviceType: { select: { displayName: true } },
      },
      take: 500,
    });
    for (const item of ttlCandidates) {
      const ttlRaw = (item.metadata as { ticketingTimeLimit?: string } | null)?.ticketingTimeLimit;
      if (!ttlRaw) continue;
      const ttl = new Date(ttlRaw);
      if (Number.isNaN(ttl.getTime())) continue;
      const hoursLeft = (ttl.getTime() - now.getTime()) / 3600000;
      if (hoursLeft <= 0 || hoursLeft > TTL_ALERT_WINDOW_HOURS) continue;

      const created = await this.createTaskOnce({
        tenantId,
        itemId: item.id,
        workflowInstanceId: item.workflowInstanceId,
        stageCode: item.currentStageCode,
        assignedToId: item.assignedToId,
        dedupeTitle: `TTL approaching: ${item.referenceNumber}`,
        description: `${item.serviceType.displayName} item ${item.referenceNumber}: ticketing time limit expires ${ttl.toISOString()} (${Math.floor(hoursLeft)}h left). Issue the ticket or revalidate the fare before expiry.`,
        priority: 'URGENT',
        dueAt: ttl,
      });
      if (created) {
        ttlAlerts += 1;
        tasksCreated += 1;
      }
    }

    const summary = { breached, warnings, ttlAlerts, tasksCreated, scannedAt: now.toISOString() };
    if (breached + warnings + ttlAlerts > 0) {
      await this.audit.logMutation(actorId, tenantId, 'WORKFLOW_TASK', 'WorkflowTask', 'automation-scan', 'CREATE', summary);
    }
    this.logger.log(`Automation scan for ${tenantId}: ${JSON.stringify(summary)}`);
    return summary;
  }
}
