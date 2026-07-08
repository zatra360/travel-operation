import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditAction } from '@prisma/client';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    tenantId: string;
    branchId?: string;
    actorId: string;
    action: AuditAction;
    module: string;
    entity: string;
    entityId?: string;
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.auditLog.create({
      data: {
        tenantId: params.tenantId,
        branchId: params.branchId,
        actorId: params.actorId,
        action: params.action,
        module: params.module,
        entity: params.entity,
        entityId: params.entityId,
        metadata: params.metadata || {},
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  }

  async logMutation(
    actorId: string,
    tenantId: string,
    module: string,
    entity: string,
    entityId: string,
    action: AuditAction,
    metadata?: Record<string, any>,
    branchId?: string,
  ) {
    return this.log({
      tenantId,
      branchId,
      actorId,
      action,
      module,
      entity,
      entityId,
      metadata,
    });
  }

  async findAll(tenantId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          actor: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
      this.prisma.auditLog.count({ where: { tenantId } }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
