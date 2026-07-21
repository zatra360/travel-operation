import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard, TenantGuard, PermissionsGuard, RequirePermissions, TenantCtx, TenantContext } from '../../common';

@ApiTags('Tenant - Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('finance') @RequirePermissions('REPORT_READ') @ApiOperation({ summary: 'Revenue vs expenses chart data' })
  finance(@TenantCtx() ctx: TenantContext) { return this.service.getFinanceReport(ctx.tenantId); }

  @Get('sales') @RequirePermissions('REPORT_READ') @ApiOperation({ summary: 'Sales pipeline and growth data' })
  sales(@TenantCtx() ctx: TenantContext) { return this.service.getSalesReport(ctx.tenantId); }

  @Get('leads') @RequirePermissions('REPORT_READ') @ApiOperation({ summary: 'Lead sources and conversion data' })
  leads(@TenantCtx() ctx: TenantContext) { return this.service.getLeadReport(ctx.tenantId); }

  @Get('attendance') @RequirePermissions('REPORT_READ') @ApiOperation({ summary: 'Attendance summary for current month' })
  attendance(@TenantCtx() ctx: TenantContext) { return this.service.getAttendanceReport(ctx.tenantId); }

  @Get('tax') @RequirePermissions('REPORT_READ') @ApiOperation({ summary: 'Tax collected over last 6 months' })
  tax(@TenantCtx() ctx: TenantContext) { return this.service.getTaxReport(ctx.tenantId); }
}
