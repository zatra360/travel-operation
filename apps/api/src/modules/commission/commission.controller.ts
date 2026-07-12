import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CommissionService } from './commission.service';
import { CreateCommissionDto } from './dto/create-commission.dto';
import { UpdateCommissionDto } from './dto/update-commission.dto';
import { QueryCommissionDto } from './dto/query-commission.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantCtx } from '../../common/decorators/tenant-context.decorator';
import { TenantContext } from '../../common/interceptors/tenant-context.interceptor';

@ApiTags('Tenant - Commissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/commissions')
export class CommissionController {
  constructor(private readonly commissionService: CommissionService) {}

  @Post()
  @RequirePermissions('COMMISSION_CREATE')
  @ApiOperation({ summary: 'Create a commission' })
  async create(@TenantCtx() ctx: TenantContext, @Body() dto: CreateCommissionDto) {
    return this.commissionService.create(ctx.tenantId, ctx.userId, dto);
  }

  @Get()
  @RequirePermissions('COMMISSION_READ')
  @ApiOperation({ summary: 'List commissions' })
  async findAll(@TenantCtx() ctx: TenantContext, @Query() query: QueryCommissionDto) {
    return this.commissionService.findAll(ctx.tenantId, query, ctx.branchId);
  }

  @Get(':id')
  @RequirePermissions('COMMISSION_READ')
  @ApiOperation({ summary: 'Get commission by ID' })
  async findById(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.commissionService.findById(ctx.tenantId, id);
  }

  @Put(':id')
  @RequirePermissions('COMMISSION_UPDATE')
  @ApiOperation({ summary: 'Update commission' })
  async update(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: UpdateCommissionDto) {
    return this.commissionService.update(ctx.tenantId, ctx.userId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('COMMISSION_DELETE')
  @ApiOperation({ summary: 'Soft delete commission' })
  async remove(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.commissionService.remove(ctx.tenantId, ctx.userId, id);
  }

  @Post(':id/approve')
  @RequirePermissions('COMMISSION_UPDATE')
  @ApiOperation({ summary: 'Approve commission' })
  async approve(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.commissionService.approve(ctx.tenantId, ctx.userId, id);
  }

  @Post(':id/reject')
  @RequirePermissions('COMMISSION_UPDATE')
  @ApiOperation({ summary: 'Reject commission' })
  async reject(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.commissionService.reject(ctx.tenantId, ctx.userId, id);
  }

  @Get(':id/timeline')
  @RequirePermissions('COMMISSION_READ')
  @ApiOperation({ summary: 'Get commission activity timeline' })
  async getTimeline(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.commissionService.getTimeline(ctx.tenantId, id);
  }
}
