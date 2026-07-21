import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrencyService } from './currency.service';
import { CreateCurrencyDto, UpdateCurrencyDto } from './dto/currency.dto';
import { JwtAuthGuard, TenantGuard, PermissionsGuard, RequirePermissions, TenantCtx, TenantContext } from '../../common';

@ApiTags('Tenant - Currencies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/currencies')
export class CurrencyController {
  constructor(private readonly service: CurrencyService) {}

  @Post() @RequirePermissions('SETTINGS_UPDATE') @ApiOperation({ summary: 'Add currency' })
  create(@TenantCtx() ctx: TenantContext, @Body() dto: CreateCurrencyDto) { return this.service.create(ctx.tenantId, dto); }

  @Get() @RequirePermissions('SETTINGS_READ') @ApiOperation({ summary: 'List currencies' })
  list(@TenantCtx() ctx: TenantContext) { return this.service.list(ctx.tenantId); }

  @Get('default') @RequirePermissions('SETTINGS_READ') @ApiOperation({ summary: 'Get default currency' })
  getDefault(@TenantCtx() ctx: TenantContext) { return this.service.getDefault(ctx.tenantId); }

  @Put(':id') @RequirePermissions('SETTINGS_UPDATE') @ApiOperation({ summary: 'Update currency' })
  update(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: UpdateCurrencyDto) { return this.service.update(ctx.tenantId, id, dto); }

  @Delete(':id') @RequirePermissions('SETTINGS_UPDATE') @ApiOperation({ summary: 'Deactivate currency' })
  remove(@TenantCtx() ctx: TenantContext, @Param('id') id: string) { return this.service.remove(ctx.tenantId, id); }
}
