import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { QueryLeadDto } from './dto/query-lead.dto';

@Injectable()
export class LeadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(tenantId: string, actorId: string, dto: CreateLeadDto) {
    const lead = await this.prisma.lead.create({
      data: {
        tenantId,
        branchId: dto.branchId ?? null,
        fullName: dto.fullName,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        status: dto.status ?? 'NEW',
        priority: dto.priority ?? 'MEDIUM',
        source: dto.source ?? null,
        serviceType: dto.serviceType ?? null,
        notes: dto.notes ?? null,
        assignedToId: dto.assignedToId ?? null,
      },
    });

    await this.audit.logMutation(
      actorId,
      tenantId,
      'LEAD',
      'Lead',
      lead.id,
      'CREATE',
      {
        fullName: lead.fullName,
      },
      lead.branchId ?? undefined,
    );

    return lead;
  }

  async findAll(tenantId: string, query: QueryLeadDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: any = { tenantId, deletedAt: null };
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.assignedToId) where.assignedToId = query.assignedToId;
    if (query.branchId) where.branchId = query.branchId;
    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.lead.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.prisma.lead.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(tenantId: string, id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async update(tenantId: string, actorId: string, id: string, dto: UpdateLeadDto) {
    await this.findById(tenantId, id);

    const lead = await this.prisma.lead.update({
      where: { id },
      data: {
        ...(dto.fullName !== undefined && { fullName: dto.fullName }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.source !== undefined && { source: dto.source }),
        ...(dto.serviceType !== undefined && { serviceType: dto.serviceType }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.assignedToId !== undefined && { assignedToId: dto.assignedToId }),
        ...(dto.branchId !== undefined && { branchId: dto.branchId }),
      },
    });

    await this.audit.logMutation(
      actorId,
      tenantId,
      'LEAD',
      'Lead',
      lead.id,
      'UPDATE',
      {
        changes: dto,
      },
      lead.branchId ?? undefined,
    );

    return lead;
  }

  async convertToClient(tenantId: string, actorId: string, id: string) {
    const lead = await this.findById(tenantId, id);

    const client = await this.prisma.client.create({
      data: {
        tenantId,
        branchId: lead.branchId,
        displayName: lead.fullName,
        email: lead.email,
        phone: lead.phone,
        type: 'PERSON',
        status: 'ACTIVE',
      },
    });

    await this.prisma.lead.update({
      where: { id },
      data: { status: 'WON', clientId: client.id },
    });

    await this.audit.logMutation(
      actorId,
      tenantId,
      'LEAD',
      'Lead',
      lead.id,
      'UPDATE',
      {
        convertedToClientId: client.id,
      },
      lead.branchId ?? undefined,
    );

    return client;
  }

  async remove(tenantId: string, actorId: string, id: string) {
    const lead = await this.findById(tenantId, id);

    await this.prisma.lead.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.audit.logMutation(
      actorId,
      tenantId,
      'LEAD',
      'Lead',
      lead.id,
      'DELETE',
      {
        fullName: lead.fullName,
      },
      lead.branchId ?? undefined,
    );

    return { id, deleted: true };
  }
}
