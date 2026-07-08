import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';
import { UpdateFollowUpDto } from './dto/update-follow-up.dto';
import { QueryFollowUpDto } from './dto/query-follow-up.dto';

@Injectable()
export class FollowUpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(tenantId: string, actorId: string, dto: CreateFollowUpDto) {
    const followUp = await this.prisma.followUp.create({
      data: {
        tenantId,
        branchId: dto.branchId ?? null,
        subject: dto.subject,
        scheduledAt: new Date(dto.scheduledAt),
        channel: dto.channel ?? 'PHONE',
        description: dto.description ?? null,
        leadId: dto.leadId ?? null,
        clientId: dto.clientId ?? null,
        assignedToId: dto.assignedToId ?? actorId,
        status: 'PENDING',
      },
    });

    await this.audit.logMutation(
      actorId,
      tenantId,
      'FOLLOW_UP',
      'FollowUp',
      followUp.id,
      'CREATE',
      {
        subject: followUp.subject,
      },
      followUp.branchId ?? undefined,
    );

    return followUp;
  }

  async findAll(tenantId: string, query: QueryFollowUpDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (query.status) where.status = query.status;
    if (query.channel) where.channel = query.channel;
    if (query.leadId) where.leadId = query.leadId;
    if (query.clientId) where.clientId = query.clientId;
    if (query.assignedToId) where.assignedToId = query.assignedToId;

    const [data, total] = await Promise.all([
      this.prisma.followUp.findMany({ where, orderBy: { scheduledAt: 'asc' }, skip, take: limit }),
      this.prisma.followUp.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(tenantId: string, id: string) {
    const followUp = await this.prisma.followUp.findFirst({
      where: { id, tenantId },
    });
    if (!followUp) throw new NotFoundException('Follow-up not found');
    return followUp;
  }

  async update(tenantId: string, actorId: string, id: string, dto: UpdateFollowUpDto) {
    await this.findById(tenantId, id);

    const followUp = await this.prisma.followUp.update({
      where: { id },
      data: {
        ...(dto.subject !== undefined && { subject: dto.subject }),
        ...(dto.scheduledAt !== undefined && { scheduledAt: new Date(dto.scheduledAt) }),
        ...(dto.channel !== undefined && { channel: dto.channel }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.leadId !== undefined && { leadId: dto.leadId }),
        ...(dto.clientId !== undefined && { clientId: dto.clientId }),
        ...(dto.assignedToId !== undefined && { assignedToId: dto.assignedToId }),
        ...(dto.branchId !== undefined && { branchId: dto.branchId }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.outcome !== undefined && { outcome: dto.outcome }),
        ...(dto.completedAt !== undefined && {
          completedAt: dto.completedAt ? new Date(dto.completedAt) : null,
        }),
      },
    });

    await this.audit.logMutation(
      actorId,
      tenantId,
      'FOLLOW_UP',
      'FollowUp',
      followUp.id,
      'UPDATE',
      {
        changes: dto,
      },
      followUp.branchId ?? undefined,
    );

    return followUp;
  }

  async complete(tenantId: string, actorId: string, id: string, outcome?: string) {
    await this.findById(tenantId, id);

    const followUp = await this.prisma.followUp.update({
      where: { id },
      data: { status: 'COMPLETED', completedAt: new Date(), outcome: outcome ?? null },
    });

    await this.audit.logMutation(
      actorId,
      tenantId,
      'FOLLOW_UP',
      'FollowUp',
      followUp.id,
      'UPDATE',
      {
        completed: true,
      },
      followUp.branchId ?? undefined,
    );

    return followUp;
  }

  async remove(tenantId: string, actorId: string, id: string) {
    const followUp = await this.findById(tenantId, id);

    await this.prisma.followUp.delete({ where: { id } });

    await this.audit.logMutation(
      actorId,
      tenantId,
      'FOLLOW_UP',
      'FollowUp',
      followUp.id,
      'DELETE',
      {
        subject: followUp.subject,
      },
      followUp.branchId ?? undefined,
    );

    return { id, deleted: true };
  }
}
