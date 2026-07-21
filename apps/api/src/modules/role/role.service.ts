import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RoleService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tenantId: string,
    data: { name: string; description?: string; permissionIds?: string[] },
  ) {
    const existing = await this.prisma.role.findUnique({
      where: { tenantId_name: { tenantId, name: data.name } },
    });
    if (existing) throw new ConflictException('Role name already exists for this tenant');

    const role = await this.prisma.role.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description,
      },
    });

    if (data.permissionIds?.length) {
      await this.prisma.rolePermission.createMany({
        data: data.permissionIds.map((permissionId) => ({
          roleId: role.id,
          permissionId,
        })),
        skipDuplicates: true,
      });
    }

    return this.findById(tenantId, role.id);
  }

  async findAll(tenantId: string) {
    return this.prisma.role.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        permissions: {
          include: { permission: true },
        },
        _count: { select: { assignments: true } },
      },
    });
  }

  async findById(tenantId: string, id: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        permissions: {
          include: { permission: true },
        },
        _count: { select: { assignments: true } },
      },
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async update(tenantId: string, id: string, data: { name?: string; description?: string; permissionIds?: string[] }) {
    await this.findById(tenantId, id);

    if (data.permissionIds) {
      await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
      await this.prisma.rolePermission.createMany({
        data: data.permissionIds.map((permissionId) => ({
          roleId: id,
          permissionId,
        })),
      });
    }

    return this.prisma.role.update({
      where: { id },
      data: { name: data.name, description: data.description },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    return this.prisma.role.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
