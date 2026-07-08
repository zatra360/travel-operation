import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { name: string; slug: string }) {
    const existing = await this.prisma.tenant.findUnique({ where: { slug: data.slug } });
    if (existing) throw new ConflictException('Tenant slug already exists');

    return this.prisma.tenant.create({ data: { ...data, status: 'ACTIVE' } });
  }

  async findAll() {
    return this.prisma.tenant.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { branches: true, users: true } } },
    });
  }

  async findById(id: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id, deletedAt: null },
      include: { branches: { where: { deletedAt: null } } },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async update(id: string, data: { name?: string; logo?: string; status?: string }) {
    const tenant = await this.findById(id);
    return this.prisma.tenant.update({ where: { id }, data: data as any });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.tenant.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'CANCELLED' as any },
    });
  }
}
