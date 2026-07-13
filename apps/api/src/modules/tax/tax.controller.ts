import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TaxService } from './tax.service';
import { CreateTaxRateDto, UpdateTaxRateDto } from './dto/tax.dto';
import { JwtAuthGuard, TenantGuard, PermissionsGuard, RequirePermissions, TenantCtx, TenantContext } from '../../common';

@ApiTags('Tenant - Tax Rates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/tax-rates')
export class TaxController {
  constructor(private readonly service: TaxService) {}

  @Post() @RequirePermissions('SETTINGS_UPDATE') @ApiOperation({ summary: 'Create tax rate' })
  create(@TenantCtx() ctx: TenantContext, @Body() dto: CreateTaxRateDto) { return this.service.create(ctx.tenantId, dto); }

  @Get() @RequirePermissions('SETTINGS_READ') @ApiOperation({ summary: 'List tax rates' })
  list(@TenantCtx() ctx: TenantContext) { return this.service.list(ctx.tenantId); }

  @Get('default') @RequirePermissions('SETTINGS_READ') @ApiOperation({ summary: 'Get default tax rate' })
  getDefault(@TenantCtx() ctx: TenantContext) { return this.service.getDefault(ctx.tenantId); }

  @Get(':id') @RequirePermissions('SETTINGS_READ') @ApiOperation({ summary: 'Get tax rate' })
  findOne(@TenantCtx() ctx: TenantContext, @Param('id') id: string) { return this.service.findOne(ctx.tenantId, id); }

  @Put(':id') @RequirePermissions('SETTINGS_UPDATE') @ApiOperation({ summary: 'Update tax rate' })
  update(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: UpdateTaxRateDto) { return this.service.update(ctx.tenantId, id, dto); }

  @Delete(':id') @RequirePermissions('SETTINGS_UPDATE') @ApiOperation({ summary: 'Deactivate tax rate' })
  remove(@TenantCtx() ctx: TenantContext, @Param('id') id: string) { return this.service.remove(ctx.tenantId, id); }
}
