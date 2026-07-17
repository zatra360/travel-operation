import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BranchService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, data: { name: string; code: string; address?: string; phone?: string; email?: string }) {
    const existing = await this.prisma.branch.findUnique({
      where: { tenantId_code: { tenantId, code: data.code } },
    });
    if (existing) throw new ConflictException('Branch code already exists for this tenant');

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { maxBranches: true } });
    if (tenant?.maxBranches) {
      const count = await this.prisma.branch.count({ where: { tenantId, deletedAt: null } });
      if (count >= tenant.maxBranches) {
        throw new BadRequestException(`Branch limit reached (${tenant.maxBranches}). Upgrade your plan to add more branches.`);
      }
    }

    return this.prisma.branch.create({
      data: { ...data, tenantId, status: 'ACTIVE' },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.branch.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(tenantId: string, id: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!branch) throw new NotFoundException('Branch not found');
    return branch;
  }

  async update(tenantId: string, id: string, data: { name?: string; address?: string; phone?: string; email?: string }) {
    await this.findById(tenantId, id);
    return this.prisma.branch.update({ where: { id }, data });
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    return this.prisma.branch.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'CLOSED' as any },
    });
  }
}
