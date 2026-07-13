import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard, TenantGuard, PermissionsGuard, RequirePermissions, TenantCtx, TenantContext } from '../../common';

@ApiTags('Tenant - Support Cases')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/cases')
export class SupportController {
  constructor(private readonly prisma: PrismaService) {}

  @Get() @RequirePermissions('TICKET_READ')
  async list(@TenantCtx() ctx: TenantContext, @Query('status') status?: string) {
    return this.prisma.case.findMany({
      where: { tenantId: ctx.tenantId, deletedAt: null, ...(status ? { status } : {}) },
      include: { channel: true, type: true, group: true, client: { select: { id: true, displayName: true } }, replies: { take: 1, orderBy: { createdAt: 'desc' } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  @Get(':id') @RequirePermissions('TICKET_READ')
  async get(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.prisma.case.findFirst({ where: { id, tenantId: ctx.tenantId }, include: { channel: true, type: true, group: true, client: { select: { id: true, displayName: true } }, replies: { orderBy: { createdAt: 'asc' } } } });
  }

  @Post() @RequirePermissions('TICKET_CREATE')
  async create(@TenantCtx() ctx: TenantContext, @Body() dto: any) {
    return this.prisma.case.create({
      data: {
        tenantId: ctx.tenantId, branchId: ctx.branchId, caseNumber: `CASE-${Date.now().toString(36).toUpperCase()}`,
        subject: dto.subject, description: dto.description, priority: dto.priority || 'MEDIUM', status: 'OPEN',
        channelId: dto.channelId, typeId: dto.typeId, groupId: dto.groupId, clientId: dto.clientId, assignedToId: dto.assignedToId, createdById: ctx.userId,
      },
    });
  }

  @Put(':id') @RequirePermissions('TICKET_UPDATE')
  async update(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: any) {
    return this.prisma.case.update({ where: { id }, data: dto });
  }

  @Post(':id/reply') @RequirePermissions('TICKET_UPDATE')
  async reply(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: any) {
    return this.prisma.caseReply.create({ data: { tenantId: ctx.tenantId, caseId: id, message: dto.message, isInternal: dto.isInternal ?? false, createdById: ctx.userId } });
  }

  @Get('refs/channels') @RequirePermissions('TICKET_READ') async channels(@TenantCtx() ctx: TenantContext) { return this.prisma.caseChannel.findMany({ where: { tenantId: ctx.tenantId, isActive: true } }); }
  @Get('refs/types') @RequirePermissions('TICKET_READ') async types(@TenantCtx() ctx: TenantContext) { return this.prisma.caseType.findMany({ where: { tenantId: ctx.tenantId, isActive: true } }); }
  @Get('refs/groups') @RequirePermissions('TICKET_READ') async groups(@TenantCtx() ctx: TenantContext) { return this.prisma.caseGroup.findMany({ where: { tenantId: ctx.tenantId, isActive: true } }); }
}
