import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InsuranceService } from './insurance.service';
import { CreateInsuranceDto, UpdateInsuranceDto, QueryInsuranceDto } from './dto/insurance.dto';
import { JwtAuthGuard, TenantGuard, PermissionsGuard, RequirePermissions, TenantCtx, TenantContext } from '../../common';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';

@ApiTags('Tenant - Insurance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/insurances')
export class InsuranceController {
  constructor(private readonly service: InsuranceService) {}

  @Post() @RequirePermissions('INSURANCE_CREATE') @ApiOperation({ summary: 'Create insurance policy' })
  create(@TenantCtx() ctx: TenantContext, @Body() dto: CreateInsuranceDto) { return this.service.create(ctx.tenantId, ctx.userId, dto); }

  @Get() @RequirePermissions('INSURANCE_READ') @ApiOperation({ summary: 'List insurance policies' })
  findAll(@TenantCtx() ctx: TenantContext, @Query() query: QueryInsuranceDto) { return this.service.findAll(ctx.tenantId, query); }

  @Get(':id') @RequirePermissions('INSURANCE_READ') @ApiOperation({ summary: 'Get policy by ID' })
  findOne(@TenantCtx() ctx: TenantContext, @Param('id') id: string) { return this.service.findById(ctx.tenantId, id); }

  @Put(':id') @RequirePermissions('INSURANCE_UPDATE') @ApiOperation({ summary: 'Update insurance policy' })
  update(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: UpdateInsuranceDto) { return this.service.update(ctx.tenantId, ctx.userId, id, dto); }

  @Delete(':id') @RequirePermissions('INSURANCE_DELETE') @ApiOperation({ summary: 'Delete policy (soft delete)' })
  remove(@TenantCtx() ctx: TenantContext, @Param('id') id: string) { return this.service.remove(ctx.tenantId, ctx.userId, id); }
}

@ApiTags('Platform - Insurance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PlatformAdminGuard, PermissionsGuard)
@Controller('platform/insurances')
export class PlatformInsuranceController {
  constructor(private readonly service: InsuranceService) {}

  @Get() @RequirePermissions('INSURANCE_READ') @ApiOperation({ summary: 'List all insurance across tenants' })
  findAll(@Query() query: QueryInsuranceDto) { return this.service.findAll('', query); }
}
