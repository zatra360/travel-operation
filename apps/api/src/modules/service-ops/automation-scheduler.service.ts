import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkflowAutomationService } from './workflow-automation.service';

/**
 * Interval-based scheduler for the SLA/TTL automation scans.
 * Enable by setting AUTOMATION_SCAN_INTERVAL_MINUTES > 0 (disabled by
 * default so tests and one-off scripts never spawn background timers).
 * Each cycle scans every tenant that currently has active service items,
 * acting as that tenant's earliest active member (audit/activity rows
 * require a real user).
 */
@Injectable()
export class AutomationSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AutomationSchedulerService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly automation: WorkflowAutomationService,
  ) {}

  onModuleInit() {
    const minutes = Number(process.env.AUTOMATION_SCAN_INTERVAL_MINUTES ?? 0);
    if (!Number.isFinite(minutes) || minutes <= 0) {
      this.logger.log('Automation scheduler disabled (set AUTOMATION_SCAN_INTERVAL_MINUTES to enable)');
      return;
    }
    this.timer = setInterval(() => {
      this.scanAllTenants().catch((err) => this.logger.error(`Scheduled scan failed: ${err.message}`));
    }, minutes * 60 * 1000);
    this.timer.unref?.();
    this.logger.log(`Automation scheduler enabled: scanning every ${minutes} minute(s)`);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async resolveSystemActor(tenantId: string): Promise<string | null> {
    const membership = await this.prisma.userTenantMembership.findFirst({
      where: { tenantId, isActive: true },
      orderBy: { joinedAt: 'asc' },
      select: { userId: true },
    });
    return membership?.userId ?? null;
  }

  async scanAllTenants() {
    if (this.running) {
      this.logger.warn('Previous scan cycle still running; skipping this tick');
      return { tenantsScanned: 0, skipped: true };
    }
    this.running = true;
    try {
      const tenants = await this.prisma.serviceCaseItem.findMany({
        where: { deletedAt: null, status: 'ACTIVE' },
        distinct: ['tenantId'],
        select: { tenantId: true },
      });

      let tenantsScanned = 0;
      for (const { tenantId } of tenants) {
        const actorId = await this.resolveSystemActor(tenantId);
        if (!actorId) {
          this.logger.warn(`Tenant ${tenantId} has active items but no active members; skipping`);
          continue;
        }
        try {
          await this.automation.runScans(tenantId, actorId);
          tenantsScanned += 1;
        } catch (err) {
          this.logger.error(`Scan failed for tenant ${tenantId}: ${(err as Error).message}`);
        }
      }
      return { tenantsScanned, skipped: false };
    } finally {
      this.running = false;
    }
  }
}
