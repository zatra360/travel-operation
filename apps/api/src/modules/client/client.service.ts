import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { QueryClientDto } from './dto/query-client.dto';

@Injectable()
export class ClientService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(tenantId: string, actorId: string, dto: CreateClientDto) {
    const client = await this.prisma.client.create({
      data: {
        tenantId,
        branchId: dto.branchId ?? null,
        displayName: dto.displayName,
        type: dto.type ?? 'PERSON',
        status: dto.status ?? 'ACTIVE',
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        companyName: dto.companyName ?? null,
        nationalityId: dto.nationalityId ?? null,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        gender: dto.gender ?? null,
      },
    });

    await this.audit.logMutation(
      actorId,
      tenantId,
      'CLIENT',
      'Client',
      client.id,
      'CREATE',
      {
        displayName: client.displayName,
      },
      client.branchId ?? undefined,
    );

    return client;
  }

  async findAll(tenantId: string, query: QueryClientDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: any = { tenantId, deletedAt: null };
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    if (query.branchId) where.branchId = query.branchId;
    if (query.search) {
      where.OR = [
        { displayName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
        { companyName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.client.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.prisma.client.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(tenantId: string, id: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  async update(tenantId: string, actorId: string, id: string, dto: UpdateClientDto) {
    await this.findById(tenantId, id);

    const client = await this.prisma.client.update({
      where: { id },
      data: {
        ...(dto.displayName !== undefined && { displayName: dto.displayName }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.companyName !== undefined && { companyName: dto.companyName }),
        ...(dto.nationalityId !== undefined && { nationalityId: dto.nationalityId }),
        ...(dto.dateOfBirth !== undefined && {
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        }),
        ...(dto.gender !== undefined && { gender: dto.gender }),
        ...(dto.branchId !== undefined && { branchId: dto.branchId }),
      },
    });

    await this.audit.logMutation(
      actorId,
      tenantId,
      'CLIENT',
      'Client',
      client.id,
      'UPDATE',
      {
        changes: dto,
      },
      client.branchId ?? undefined,
    );

    return client;
  }

  async remove(tenantId: string, actorId: string, id: string) {
    const client = await this.findById(tenantId, id);

    await this.prisma.client.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.audit.logMutation(
      actorId,
      tenantId,
      'CLIENT',
      'Client',
      client.id,
      'DELETE',
      {
        displayName: client.displayName,
      },
      client.branchId ?? undefined,
    );

    return { id, deleted: true };
  }
}
