import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Service-level operational reporting. All aggregation happens in the
 * database (groupBy / SQL aggregates) — records are never loaded into
 * memory wholesale.
 */
@Injectable()
export class ServiceReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(tenantId: string) {
    const now = new Date();

    const [caseCounts, itemGroups, breachedCount, dueSoonCount, completionRows, serviceTypes] = await Promise.all([
      this.prisma.serviceCase.groupBy({
        by: ['status'],
        where: { tenantId, deletedAt: null },
        _count: true,
      }),
      this.prisma.serviceCaseItem.groupBy({
        by: ['serviceTypeId', 'status'],
        where: { tenantId, deletedAt: null },
        _count: true,
        _sum: { serviceAmount: true, supplierCost: true, grossProfit: true },
      }),
      this.prisma.serviceCaseItem.count({
        where: { tenantId, deletedAt: null, status: 'ACTIVE', slaDueAt: { lt: now } },
      }),
      this.prisma.serviceCaseItem.count({
        where: { tenantId, deletedAt: null, status: 'ACTIVE', slaDueAt: { gte: now, lte: new Date(now.getTime() + 24 * 3600 * 1000) } },
      }),
      this.prisma.$queryRaw<Array<{ serviceTypeId: string; avg_hours: unknown; completed: bigint }>>`
        SELECT "serviceTypeId",
               AVG(EXTRACT(EPOCH FROM ("completedAt" - "createdAt")) / 3600) AS avg_hours,
               COUNT(*) AS completed
          FROM "ServiceCaseItem"
         WHERE "tenantId" = ${tenantId} AND "deletedAt" IS NULL AND "completedAt" IS NOT NULL
         GROUP BY "serviceTypeId"`,
      this.prisma.serviceType.findMany({ select: { id: true, systemCode: true, displayName: true, icon: true } }),
    ]);

    const typeMap = new Map(serviceTypes.map((t) => [t.id, t]));
    const completionMap = new Map(completionRows.map((r) => [r.serviceTypeId, { avgHours: round2(Number(r.avg_hours ?? 0)), completed: Number(r.completed) }]));

    const perService = new Map<string, {
      systemCode: string; displayName: string; icon?: string | null;
      active: number; completed: number; cancelled: number;
      revenue: number; cost: number; profit: number; avgCompletionHours: number | null;
    }>();

    for (const group of itemGroups) {
      const type = typeMap.get(group.serviceTypeId);
      if (!type) continue;
      const entry = perService.get(group.serviceTypeId) ?? {
        systemCode: type.systemCode, displayName: type.displayName, icon: type.icon,
        active: 0, completed: 0, cancelled: 0, revenue: 0, cost: 0, profit: 0,
        avgCompletionHours: completionMap.get(group.serviceTypeId)?.avgHours ?? null,
      };
      const count = typeof group._count === 'number' ? group._count : 0;
      if (group.status === 'ACTIVE' || group.status === 'ON_HOLD') entry.active += count;
      else if (group.status === 'COMPLETED') entry.completed += count;
      else if (group.status === 'CANCELLED') entry.cancelled += count;
      if (group.status !== 'CANCELLED') {
        entry.revenue = round2(entry.revenue + Number(group._sum.serviceAmount ?? 0));
        entry.cost = round2(entry.cost + Number(group._sum.supplierCost ?? 0));
        entry.profit = round2(entry.profit + Number(group._sum.grossProfit ?? 0));
      }
      perService.set(group.serviceTypeId, entry);
    }

    const services = [...perService.values()].sort((a, b) => b.revenue - a.revenue);
    const totals = services.reduce(
      (t, s) => ({
        active: t.active + s.active,
        completed: t.completed + s.completed,
        revenue: round2(t.revenue + s.revenue),
        profit: round2(t.profit + s.profit),
      }),
      { active: 0, completed: 0, revenue: 0, profit: 0 },
    );

    return {
      cases: Object.fromEntries(caseCounts.map((c) => [c.status, typeof c._count === 'number' ? c._count : 0])),
      totals: { ...totals, slaBreached: breachedCount, slaDueSoon: dueSoonCount },
      services,
    };
  }

  async slaReport(tenantId: string) {
    const now = new Date();
    const soon = new Date(now.getTime() + 24 * 3600 * 1000);
    const select = {
      id: true, referenceNumber: true, currentStageCode: true, slaDueAt: true,
      assignedToId: true, priority: true,
      serviceType: { select: { systemCode: true, displayName: true, icon: true } },
      serviceCase: { select: { id: true, caseNumber: true, title: true } },
    } as const;

    const [breached, atRisk] = await Promise.all([
      this.prisma.serviceCaseItem.findMany({
        where: { tenantId, deletedAt: null, status: 'ACTIVE', slaDueAt: { lt: now } },
        select, orderBy: { slaDueAt: 'asc' }, take: 100,
      }),
      this.prisma.serviceCaseItem.findMany({
        where: { tenantId, deletedAt: null, status: 'ACTIVE', slaDueAt: { gte: now, lte: soon } },
        select, orderBy: { slaDueAt: 'asc' }, take: 100,
      }),
    ]);

    const userIds = [...new Set([...breached, ...atRisk].map((i) => i.assignedToId).filter(Boolean))] as string[];
    const users = userIds.length
      ? await this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, firstName: true, lastName: true } })
      : [];
    const userMap = new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName}`]));
    const withAssignee = (items: typeof breached) =>
      items.map((i) => ({ ...i, assigneeName: i.assignedToId ? userMap.get(i.assignedToId) ?? null : null }));

    return { breached: withAssignee(breached), atRisk: withAssignee(atRisk) };
  }

  async workloadReport(tenantId: string) {
    const now = new Date();
    const [active, overdue] = await Promise.all([
      this.prisma.serviceCaseItem.groupBy({
        by: ['assignedToId'],
        where: { tenantId, deletedAt: null, status: 'ACTIVE' },
        _count: true,
      }),
      this.prisma.serviceCaseItem.groupBy({
        by: ['assignedToId'],
        where: { tenantId, deletedAt: null, status: 'ACTIVE', slaDueAt: { lt: now } },
        _count: true,
      }),
    ]);

    const overdueMap = new Map(overdue.map((o) => [o.assignedToId, typeof o._count === 'number' ? o._count : 0]));
    const userIds = active.map((a) => a.assignedToId).filter(Boolean) as string[];
    const users = userIds.length
      ? await this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, firstName: true, lastName: true } })
      : [];
    const userMap = new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName}`]));

    return active
      .map((a) => ({
        assignedToId: a.assignedToId,
        assigneeName: a.assignedToId ? userMap.get(a.assignedToId) ?? 'Unknown' : 'Unassigned',
        activeItems: typeof a._count === 'number' ? a._count : 0,
        overdueItems: overdueMap.get(a.assignedToId) ?? 0,
      }))
      .sort((a, b) => b.activeItems - a.activeItems);
  }

  async bottlenecks(tenantId: string) {
    const [slowest, stuck] = await Promise.all([
      this.prisma.$queryRaw<Array<{ stageCode: string; stageName: string; stageGroup: string; samples: bigint; avg_hours: unknown }>>`
        SELECT "stageCode", MAX("stageName") AS "stageName", MAX("stageGroup") AS "stageGroup",
               COUNT(*) AS samples,
               AVG(EXTRACT(EPOCH FROM ("completedAt" - "enteredAt")) / 3600) AS avg_hours
          FROM "WorkflowStageInstance"
         WHERE "tenantId" = ${tenantId} AND "completedAt" IS NOT NULL
         GROUP BY "stageCode"
        HAVING COUNT(*) >= 1
         ORDER BY avg_hours DESC
         LIMIT 15`,
      this.prisma.serviceCaseItem.groupBy({
        by: ['currentStageCode'],
        where: { tenantId, deletedAt: null, status: 'ACTIVE', currentStageCode: { not: null } },
        _count: true,
        orderBy: { _count: { currentStageCode: 'desc' } },
        take: 15,
      }),
    ]);

    return {
      slowestStages: slowest.map((s) => ({
        stageCode: s.stageCode,
        stageName: s.stageName,
        stageGroup: s.stageGroup,
        samples: Number(s.samples),
        avgHours: round2(Number(s.avg_hours ?? 0)),
      })),
      itemsPerStage: stuck.map((s) => ({
        stageCode: s.currentStageCode,
        count: typeof s._count === 'number' ? s._count : 0,
      })),
    };
  }
}
