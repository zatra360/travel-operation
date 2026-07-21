import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ClientScoringService {
  private readonly logger = new Logger(ClientScoringService.name);

  constructor(private readonly prisma: PrismaService) {}

  async computeAndPersist(tenantId: string, clientId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!client) return null;

    const [bookings, payments, cancellations, refunds, latestActivity] = await Promise.all([
      this.prisma.booking.count({ where: { tenantId, clientId } }),
      this.prisma.payment.count({ where: { tenantId, clientId } }),
      this.prisma.cancellationRequest.count({ where: { tenantId, clientId } }),
      this.prisma.refundRequest.count({ where: { tenantId, clientId } }),
      this.prisma.activity.findFirst({ where: { tenantId, entity: 'Client', entityId: clientId }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
    ]);

    let score = 0;
    score += bookings * 10;
    score += payments * 5;
    score -= cancellations * 20;
    score -= refunds * 15;

    const daysSinceActivity = latestActivity?.createdAt
      ? (Date.now() - latestActivity.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      : 999;
    if (daysSinceActivity <= 30) score += 20;
    else if (daysSinceActivity <= 90) score += 10;
    else if (daysSinceActivity > 180) score -= 15;

    score = Math.max(0, Math.min(100, score));

    const totalSpentAgg = await this.prisma.payment.aggregate({ where: { tenantId, clientId }, _sum: { amount: true } });
    const totalSpent = Number(totalSpentAgg._sum?.amount ?? 0);

    await this.prisma.client.update({
      where: { id: clientId },
      data: {
        activityScore: score,
        totalBookings: bookings,
        totalPayments: payments,
        totalSpent,
        lifetimeValue: totalSpent,
        lastScoredAt: new Date(),
      },
    });

    return { activityScore: score, bookings, payments, cancellations, refunds, totalSpent, daysSinceActivity: Math.round(daysSinceActivity) };
  }

  refreshInBackground(tenantId: string, clientId?: string | null) {
    if (!clientId) return;
    this.computeAndPersist(tenantId, clientId).catch((err: Error) => {
      this.logger.warn(`Failed to refresh activity score for client ${clientId}: ${err.message}`);
    });
  }
}
