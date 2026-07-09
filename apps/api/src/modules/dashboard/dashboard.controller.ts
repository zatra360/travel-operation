import { Controller, Get, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantCtx } from '../../common/decorators/tenant-context.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TenantContext } from '../../common/interceptors/tenant-context.interceptor';

@ApiTags('Tenant - Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @RequirePermissions('DASHBOARD_READ')
  @ApiOperation({ summary: 'Get tenant dashboard statistics' })
  async getStats(@TenantCtx() ctx: TenantContext) {
    return this.dashboardService.getTenantStats(ctx.tenantId, ctx.branchId);
  }
}

@ApiTags('Platform - Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('platform/dashboard')
export class PlatformDashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @RequirePermissions('DASHBOARD_READ')
  @ApiOperation({ summary: 'Get platform dashboard statistics' })
  async getStats(@CurrentUser() user: any) {
    if (!user.isPlatformSuperAdmin) {
      throw new ForbiddenException('Only platform super admins can access platform dashboard');
    }
    return this.dashboardService.getPlatformStats();
  }
}
