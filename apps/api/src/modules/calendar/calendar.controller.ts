import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard, TenantGuard, PermissionsGuard, RequirePermissions, TenantCtx, TenantContext } from '../../common';

@ApiTags('Tenant - Calendar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/calendar')
export class CalendarController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('events')
  @RequirePermissions('DASHBOARD_READ')
  @ApiOperation({ summary: 'Get events for a date range' })
  async getEvents(@TenantCtx() ctx: TenantContext, @Query('from') from: string, @Query('to') to: string) {
    return this.prisma.event.findMany({
      where: { tenantId: ctx.tenantId, startDate: { gte: new Date(from), lte: new Date(to) } },
      orderBy: { startDate: 'asc' },
    });
  }

  @Post('events')
  @RequirePermissions('DASHBOARD_READ')
  @ApiOperation({ summary: 'Create an event' })
  async createEvent(@TenantCtx() ctx: TenantContext, @Body() dto: any) {
    return this.prisma.event.create({
      data: {
        tenantId: ctx.tenantId, branchId: ctx.branchId,
        title: dto.title, description: dto.description,
        startDate: new Date(dto.startDate), endDate: dto.endDate ? new Date(dto.endDate) : null,
        allDay: dto.allDay ?? false, color: dto.color, type: dto.type ?? 'GENERAL',
        createdById: ctx.userId,
      },
    });
  }

  @Put('events/:id') @RequirePermissions('DASHBOARD_READ')
  async updateEvent(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: any) {
    await this.prisma.event.findFirstOrThrow({ where: { id, tenantId: ctx.tenantId } });
    return this.prisma.event.update({ where: { id }, data: dto });
  }

  @Delete('events/:id') @RequirePermissions('DASHBOARD_READ')
  async deleteEvent(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.prisma.event.delete({ where: { id } });
  }

  @Get('holidays')
  @RequirePermissions('DASHBOARD_READ')
  async getHolidays(@TenantCtx() ctx: TenantContext) {
    return this.prisma.holiday.findMany({ where: { tenantId: ctx.tenantId }, orderBy: { date: 'asc' } });
  }

  @Post('holidays')
  @RequirePermissions('DASHBOARD_READ')
  async createHoliday(@TenantCtx() ctx: TenantContext, @Body() dto: any) {
    return this.prisma.holiday.create({ data: { tenantId: ctx.tenantId, name: dto.name, date: new Date(dto.date) } });
  }

  @Delete('holidays/:id') @RequirePermissions('DASHBOARD_READ')
  async deleteHoliday(@Param('id') id: string) { return this.prisma.holiday.delete({ where: { id } }); }
}
