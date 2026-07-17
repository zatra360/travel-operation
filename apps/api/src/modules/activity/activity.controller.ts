import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ActivityService } from './activity.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantCtx } from '../../common/decorators/tenant-context.decorator';
import { TenantContext } from '../../common/interceptors/tenant-context.interceptor';

@ApiTags('Tenant - Activity') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/activity')
export class ActivityController {
  constructor(private readonly service: ActivityService) {}
  @Get() @RequirePermissions('AUDIT_LOG_READ') @ApiOperation({ summary: 'List activity stream' }) async findAll(@TenantCtx() ctx: TenantContext, @Query('page') page?: number, @Query('limit') limit?: number, @Query('userId') userId?: string) { return this.service.findAll(ctx.tenantId, page ?? 1, limit ?? 50, userId); }

  @Get('entity/:entity/:entityId')
  @RequirePermissions('AUDIT_LOG_READ')
  @ApiOperation({ summary: 'Get activity timeline for a specific entity' })
  @ApiParam({ name: 'entity', description: 'Entity type (e.g., Lead, Booking, Invoice)' })
  @ApiParam({ name: 'entityId', description: 'Entity ID' })
  async findByEntity(
    @TenantCtx() ctx: TenantContext,
    @Param('entity') entity: string,
    @Param('entityId') entityId: string,
    @Query('limit') limit?: number,
  ) {
    return this.service.findByEntity(ctx.tenantId, entity, entityId, limit);
  }
}
