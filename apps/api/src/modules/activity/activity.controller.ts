import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ActivityService } from './activity.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantCtx } from '../../common/decorators/tenant-context.decorator';
import { TenantContext } from '../../common/interceptors/tenant-context.interceptor';

@ApiTags('Tenant - Activity') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('tenant/activity')
export class ActivityController {
  constructor(private readonly service: ActivityService) {}
  @Get() @ApiOperation({ summary: 'List activity stream' }) async findAll(@TenantCtx() ctx: TenantContext, @Query('page') page?: number, @Query('limit') limit?: number, @Query('userId') userId?: string) { return this.service.findAll(ctx.tenantId, page ?? 1, limit ?? 50, userId); }
}
