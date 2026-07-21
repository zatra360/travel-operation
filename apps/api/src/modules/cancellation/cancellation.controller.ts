import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CancellationService } from './cancellation.service';
import { CreateCancellationDto } from './dto/create-cancellation.dto';
import { UpdateCancellationDto } from './dto/update-cancellation.dto';
import { QueryCancellationDto } from './dto/query-cancellation.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantCtx } from '../../common/decorators/tenant-context.decorator';
import { TenantContext } from '../../common/interceptors/tenant-context.interceptor';

@ApiTags('Tenant - Cancellations') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/cancellations')
export class CancellationController {
  constructor(private readonly cancellationService: CancellationService) {}

  @Post() @RequirePermissions('CANCELLATION_CREATE') @ApiOperation({ summary: 'Create a cancellation request' })
  async create(@TenantCtx() ctx: TenantContext, @Body() dto: CreateCancellationDto) { return this.cancellationService.create(ctx.tenantId, ctx.userId, dto); }

  @Get() @RequirePermissions('CANCELLATION_READ') @ApiOperation({ summary: 'List cancellation requests' })
  async findAll(@TenantCtx() ctx: TenantContext, @Query() query: QueryCancellationDto) { return this.cancellationService.findAll(ctx.tenantId, query, ctx.branchId); }

  @Get(':id') @RequirePermissions('CANCELLATION_READ') @ApiOperation({ summary: 'Get cancellation request' })
  async findById(@TenantCtx() ctx: TenantContext, @Param('id') id: string) { return this.cancellationService.findById(ctx.tenantId, id); }

  @Put(':id') @RequirePermissions('CANCELLATION_UPDATE') @ApiOperation({ summary: 'Update cancellation request' })
  async update(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: UpdateCancellationDto) { return this.cancellationService.update(ctx.tenantId, ctx.userId, id, dto); }

  @Post(':id/approve') @RequirePermissions('CANCELLATION_UPDATE') @ApiOperation({ summary: 'Approve cancellation request' })
  async approve(@TenantCtx() ctx: TenantContext, @Param('id') id: string) { return this.cancellationService.approve(ctx.tenantId, ctx.userId, id); }

  @Post(':id/reject') @RequirePermissions('CANCELLATION_UPDATE') @ApiOperation({ summary: 'Reject cancellation request' })
  async reject(@TenantCtx() ctx: TenantContext, @Param('id') id: string) { return this.cancellationService.reject(ctx.tenantId, ctx.userId, id); }

  @Post(':id/process') @RequirePermissions('CANCELLATION_UPDATE') @ApiOperation({ summary: 'Process cancellation request' })
  async process(@TenantCtx() ctx: TenantContext, @Param('id') id: string) { return this.cancellationService.process(ctx.tenantId, ctx.userId, id); }

  @Get(':id/timeline') @RequirePermissions('CANCELLATION_READ') @ApiOperation({ summary: 'Get cancellation timeline' })
  async getTimeline(@TenantCtx() ctx: TenantContext, @Param('id') id: string) { return this.cancellationService.getTimeline(ctx.tenantId, id); }

  @Delete(':id') @RequirePermissions('CANCELLATION_DELETE') @ApiOperation({ summary: 'Delete cancellation request' })
  async remove(@TenantCtx() ctx: TenantContext, @Param('id') id: string) { return this.cancellationService.remove(ctx.tenantId, ctx.userId, id); }
}
