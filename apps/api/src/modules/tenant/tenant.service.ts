import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTenantDto) {
    const existing = await this.prisma.tenant.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('Tenant slug already exists');

    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: dto.name, slug: dto.slug, status: 'ACTIVE' },
      });

      if (dto.ownerEmail) {
        let user = await tx.user.findUnique({ where: { email: dto.ownerEmail } });
        if (!user) {
          if (!dto.ownerPassword) throw new BadRequestException(`User with email ${dto.ownerEmail} not found. Provide ownerPassword to auto-create.`);
          user = await tx.user.create({
            data: {
              email: dto.ownerEmail, passwordHash: await bcrypt.hash(dto.ownerPassword, 12),
              firstName: dto.ownerFirstName || 'Owner', lastName: dto.ownerLastName || 'Admin', status: 'ACTIVE',
            },
          });
        }

        await tx.userTenantMembership.create({
          data: { userId: user.id, tenantId: tenant.id, role: 'OWNER' },
        });

        const role = await tx.role.create({
          data: { tenantId: tenant.id, name: 'Owner', description: 'Tenant owner with full access', isSystem: true },
        });

        const permissions = await tx.permission.findMany();
        if (permissions.length > 0) {
          await tx.rolePermission.createMany({
            data: permissions.map((p) => ({ roleId: role.id, permissionId: p.id })),
          });
        }

        await tx.userRoleAssignment.create({
          data: { userId: user.id, roleId: role.id, tenantId: tenant.id },
        });
      }

      return tenant;
    });
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
      include: { branches: { where: { deletedAt: null } }, users: { include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } } } },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async update(id: string, data: UpdateTenantDto) {
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
