import { Controller, Get, Post, Body, UseGuards, BadRequestException, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard, TenantGuard, RequirePermissions, TenantCtx, TenantContext } from '../../common';

@ApiTags('Tenant - Subscription')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('tenant/subscription')
export class TenantSubscriptionController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'View current subscription and package details' })
  async get(@TenantCtx() ctx: TenantContext) {
    const sub = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId: ctx.tenantId },
      include: {
        package: true,
        tenant: { select: { id: true, name: true, slug: true, status: true, trialEndsAt: true, maxUsers: true, maxBranches: true } },
      },
    });

    if (!sub) throw new NotFoundException('No subscription found');

    const userCount = await this.prisma.userTenantMembership.count({ where: { tenantId: ctx.tenantId, isActive: true } });
    const branchCount = await this.prisma.branch.count({ where: { tenantId: ctx.tenantId, deletedAt: null } });
    const storageDocs = await this.prisma.document.count({ where: { tenantId: ctx.tenantId } });

    return {
      ...sub,
      usage: { users: userCount, branches: branchCount, documents: storageDocs },
    };
  }

  @Get('packages')
  @ApiOperation({ summary: 'List available subscription packages (for upgrade/downgrade)' })
  async listPackages() {
    return this.prisma.package.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, code: true, description: true, priceMonthly: true, priceYearly: true, maxUsers: true, maxBranches: true, features: true },
    });
  }

  @Post('change')
  @ApiOperation({ summary: 'Change subscription plan (upgrade/downgrade)' })
  async change(@TenantCtx() ctx: TenantContext, @Body() dto: { packageId: string; billingCycle?: string }) {
    const current = await this.prisma.tenantSubscription.findUnique({ where: { tenantId: ctx.tenantId } });
    if (!current) throw new NotFoundException('No active subscription');

    const pkg = await this.prisma.package.findUnique({ where: { id: dto.packageId } });
    if (!pkg || !pkg.isActive) throw new BadRequestException('Invalid package');

    const sub = await this.prisma.tenantSubscription.update({
      where: { tenantId: ctx.tenantId },
      data: {
        packageId: dto.packageId,
        billingCycle: (dto.billingCycle as any) || current.billingCycle,
        startedAt: current.startedAt || new Date(),
      },
    });

    await this.prisma.tenant.update({
      where: { id: ctx.tenantId },
      data: { maxUsers: pkg.maxUsers, maxBranches: pkg.maxBranches, status: 'ACTIVE' },
    });

    return { success: true, plan: pkg.name, billingCycle: sub.billingCycle };
  }

  @Post('cancel')
  @ApiOperation({ summary: 'Cancel current subscription' })
  async cancel(@TenantCtx() ctx: TenantContext) {
    const sub = await this.prisma.tenantSubscription.findUnique({ where: { tenantId: ctx.tenantId } });
    if (!sub) throw new NotFoundException('No active subscription');
    if (sub.status === 'CANCELLED') throw new BadRequestException('Subscription is already cancelled');

    await this.prisma.tenantSubscription.update({
      where: { tenantId: ctx.tenantId },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });

    await this.prisma.tenant.update({
      where: { id: ctx.tenantId },
      data: { status: 'CANCELLED' },
    });

    return { success: true, message: 'Subscription cancelled' };
  }
}
