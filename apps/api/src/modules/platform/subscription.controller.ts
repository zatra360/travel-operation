import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Platform - Subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@Controller('platform/packages')
export class PackageController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List all subscription packages' })
  async list() {
    return this.prisma.package.findMany({ orderBy: { sortOrder: 'asc' }, include: { _count: { select: { subscriptions: true } } } });
  }

  @Post()
  @ApiOperation({ summary: 'Create a new package' })
  async create(@Body() dto: any) {
    return this.prisma.package.create({ data: dto });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a package' })
  async update(@Param('id') id: string, @Body() dto: any) {
    return this.prisma.package.update({ where: { id }, data: dto });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate a package' })
  async remove(@Param('id') id: string) {
    return this.prisma.package.update({ where: { id }, data: { isActive: false } });
  }
}

@ApiTags('Platform - Subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@Controller('platform/subscriptions')
export class SubscriptionController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List all tenant subscriptions' })
  async list() {
    return this.prisma.tenantSubscription.findMany({
      include: { tenant: { select: { id: true, name: true, slug: true, status: true } }, package: { select: { id: true, name: true, code: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post()
  @ApiOperation({ summary: 'Create/update a tenant subscription' })
  async upsert(@Body() dto: any) {
    const sub = await this.prisma.tenantSubscription.upsert({
      where: { tenantId: dto.tenantId },
      create: {
        tenantId: dto.tenantId, packageId: dto.packageId,
        status: dto.status || 'ACTIVE', billingCycle: dto.billingCycle || 'MONTHLY',
        trialEndsAt: dto.trialEndsAt ? new Date(dto.trialEndsAt) : null,
      },
      update: {
        packageId: dto.packageId, status: dto.status,
        billingCycle: dto.billingCycle, trialEndsAt: dto.trialEndsAt ? new Date(dto.trialEndsAt) : null,
      },
    });

    await this.prisma.tenant.update({
      where: { id: dto.tenantId },
      data: {
        trialEndsAt: dto.trialEndsAt ? new Date(dto.trialEndsAt) : undefined,
        maxUsers: dto.maxUsers,
        maxBranches: dto.maxBranches,
        status: dto.tenantStatus,
      },
    });

    return sub;
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a subscription' })
  async cancel(@Param('id') id: string) {
    const sub = await this.prisma.tenantSubscription.update({
      where: { id }, data: { status: 'CANCELLED', cancelledAt: new Date() },
    });
    await this.prisma.tenant.update({ where: { id: sub.tenantId }, data: { status: 'CANCELLED' } });
    return sub;
  }

  @Post(':id/renew')
  @ApiOperation({ summary: 'Renew a subscription' })
  async renew(@Param('id') id: string) {
    const sub = await this.prisma.tenantSubscription.update({
      where: { id }, data: { status: 'ACTIVE', renewedAt: new Date(), endsAt: null },
    });
    await this.prisma.tenant.update({ where: { id: sub.tenantId }, data: { status: 'ACTIVE' } });
    return sub;
  }
}
