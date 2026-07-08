import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, page = 1, limit = 50, userId?: string) {
    const skip = (page - 1) * limit; const where: any = { tenantId }; if (userId) where.userId = userId;
    const [data, total] = await Promise.all([this.prisma.activity.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }), this.prisma.activity.count({ where })]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async log(tenantId: string, userId: string, type: string, subject: string, entity?: string, entityId?: string, branchId?: string | null) {
    return this.prisma.activity.create({
      data: { tenantId, branchId: branchId ?? null, userId, type, subject, entity: entity ?? null, entityId: entityId ?? null },
    });
  }
}
