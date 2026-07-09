import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RefundService } from './refund.service';
import { CreateRefundDto } from './dto/create-refund.dto';
import { UpdateRefundDto } from './dto/update-refund.dto';
import { QueryRefundDto } from './dto/query-refund.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantCtx } from '../../common/decorators/tenant-context.decorator';
import { TenantContext } from '../../common/interceptors/tenant-context.interceptor';

@ApiTags('Tenant - Refunds') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/refunds')
export class RefundController {
  constructor(private readonly refundService: RefundService) {}

  @Post() @RequirePermissions('REFUND_CREATE') @ApiOperation({ summary: 'Create a refund request' })
  async create(@TenantCtx() ctx: TenantContext, @Body() dto: CreateRefundDto) { return this.refundService.create(ctx.tenantId, ctx.userId, dto); }

  @Get() @RequirePermissions('REFUND_READ') @ApiOperation({ summary: 'List refund requests' })
  async findAll(@TenantCtx() ctx: TenantContext, @Query() query: QueryRefundDto) { return this.refundService.findAll(ctx.tenantId, query); }

  @Get(':id') @RequirePermissions('REFUND_READ') @ApiOperation({ summary: 'Get refund request' })
  async findById(@TenantCtx() ctx: TenantContext, @Param('id') id: string) { return this.refundService.findById(ctx.tenantId, id); }

  @Put(':id') @RequirePermissions('REFUND_UPDATE') @ApiOperation({ summary: 'Update refund request' })
  async update(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: UpdateRefundDto) { return this.refundService.update(ctx.tenantId, ctx.userId, id, dto); }

  @Post(':id/approve') @RequirePermissions('REFUND_UPDATE') @ApiOperation({ summary: 'Approve refund request' })
  async approve(@TenantCtx() ctx: TenantContext, @Param('id') id: string) { return this.refundService.approve(ctx.tenantId, ctx.userId, id); }

  @Post(':id/reject') @RequirePermissions('REFUND_UPDATE') @ApiOperation({ summary: 'Reject refund request' })
  async reject(@TenantCtx() ctx: TenantContext, @Param('id') id: string) { return this.refundService.reject(ctx.tenantId, ctx.userId, id); }

  @Post(':id/process') @RequirePermissions('REFUND_UPDATE') @ApiOperation({ summary: 'Process refund request' })
  async process(@TenantCtx() ctx: TenantContext, @Param('id') id: string) { return this.refundService.process(ctx.tenantId, ctx.userId, id); }

  @Get(':id/timeline') @RequirePermissions('REFUND_READ') @ApiOperation({ summary: 'Get refund timeline' })
  async getTimeline(@TenantCtx() ctx: TenantContext, @Param('id') id: string) { return this.refundService.getTimeline(ctx.tenantId, id); }

  @Delete(':id') @RequirePermissions('REFUND_DELETE') @ApiOperation({ summary: 'Delete refund request' })
  async remove(@TenantCtx() ctx: TenantContext, @Param('id') id: string) { return this.refundService.remove(ctx.tenantId, ctx.userId, id); }
}
