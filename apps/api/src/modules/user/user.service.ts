import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }) {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictException('Email already exists');

    const passwordHash = await bcrypt.hash(data.password, 12);

    return this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      where: { deletedAt: null, isPlatformSuperAdmin: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        status: true,
        isPlatformSuperAdmin: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
  }

  async findByTenant(tenantId: string) {
    const memberships = await this.prisma.userTenantMembership.findMany({
      where: { tenantId, isActive: true },
      include: {
        user: {
          select: {
            id: true, email: true, firstName: true, lastName: true,
            phone: true, avatar: true, status: true, lastLoginAt: true, createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return memberships.map((m) => ({ ...m.user, membershipRole: m.role, joinedAt: m.joinedAt }));
  }

  async addToTenant(tenantId: string, userId: string, role: string = 'MEMBER') {
    const membership = await this.prisma.userTenantMembership.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    });

    if (!membership || !membership.isActive) {
      const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { maxUsers: true } });
      const count = await this.prisma.userTenantMembership.count({ where: { tenantId, isActive: true } });
      if (tenant?.maxUsers && count >= tenant.maxUsers) {
        throw new BadRequestException(`User limit reached (${tenant.maxUsers}). Upgrade your plan to add more users.`);
      }
    }

    return this.prisma.userTenantMembership.upsert({
      where: { userId_tenantId: { userId, tenantId } },
      update: { role: role as any, isActive: true },
      create: { userId, tenantId, role: role as any },
    });
  }

  async removeFromTenant(tenantId: string, userId: string) {
    return this.prisma.userTenantMembership.updateMany({
      where: { tenantId, userId },
      data: { isActive: false },
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        status: true,
        isPlatformSuperAdmin: true,
        lastLoginAt: true,
        createdAt: true,
        tenantMemberships: {
          include: { tenant: { select: { id: true, name: true, slug: true } } },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, data: { firstName?: string; lastName?: string; phone?: string; status?: string }) {
    await this.findById(id);
    return this.prisma.user.update({
      where: { id },
      data: data as any,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        status: true,
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'INACTIVE' },
    });
  }
}
