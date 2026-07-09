import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface TimelineEvent {
  id: string;
  type: string;
  subject: string;
  content?: string | null;
  entity?: string | null;
  entityId?: string | null;
  metadata?: any;
  userId: string;
  userName?: string;
  createdAt: Date;
}

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, page = 1, limit = 50, userId?: string) {
    const skip = (page - 1) * limit;
    const where: any = { tenantId };
    if (userId) where.userId = userId;

    const [data, total] = await Promise.all([
      this.prisma.activity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.activity.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findByEntity(
    tenantId: string,
    entity: string,
    entityId: string,
    limit = 50,
  ): Promise<TimelineEvent[]> {
    const activities = await this.prisma.activity.findMany({
      where: { tenantId, entity, entityId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const userIds = [...new Set(activities.map((a) => a.userId))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true },
    });
    const userMap = new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName}`]));

    return activities.map((a) => ({
      id: a.id,
      type: a.type,
      subject: a.subject,
      content: a.content,
      entity: a.entity,
      entityId: a.entityId,
      metadata: a.metadata,
      userId: a.userId,
      userName: userMap.get(a.userId) ?? 'Unknown',
      createdAt: a.createdAt,
    }));
  }

  async log(
    tenantId: string,
    userId: string,
    type: string,
    subject: string,
    entity?: string,
    entityId?: string,
    branchId?: string | null,
    content?: string,
    metadata?: Record<string, any>,
  ) {
    return this.prisma.activity.create({
      data: {
        tenantId,
        branchId: branchId ?? null,
        userId,
        type,
        subject,
        content: content ?? null,
        entity: entity ?? null,
        entityId: entityId ?? null,
        metadata: metadata ?? {},
      },
    });
  }

  async logEntityEvent(params: {
    tenantId: string;
    userId: string;
    type: string;
    subject: string;
    entity: string;
    entityId: string;
    branchId?: string | null;
    content?: string;
    metadata?: Record<string, any>;
  }) {
    return this.log(
      params.tenantId,
      params.userId,
      params.type,
      params.subject,
      params.entity,
      params.entityId,
      params.branchId,
      params.content,
      params.metadata,
    );
  }
}
