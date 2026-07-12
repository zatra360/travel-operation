import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MasterDataService } from './master-data.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantCtx } from '../../common/decorators/tenant-context.decorator';
import { TenantContext } from '../../common/interceptors/tenant-context.interceptor';
import { CreateMasterDataCategoryDto, UpdateMasterDataCategoryDto, CreateMasterDataItemDto, UpdateMasterDataItemDto, UpsertTenantOverrideDto, HideRestoreItemDto } from './dto/master-data.dto';

@ApiTags('Master Data - Reference') @ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('master-data/reference')
export class MasterDataReferenceController {
  constructor(private readonly service: MasterDataService) {}
  @Get('countries') @ApiOperation({ summary: 'List countries' }) async countries(@Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string) { return this.service.listCountries(page ?? 1, limit ?? 50, search); }
  @Get('countries/:id') async country(@Param('id') id: string) { return this.service.getCountry(id); }
  @Get('nationalities') async nationalities(@Query('page') page?: number, @Query('limit') limit?: number, @Query('countryId') countryId?: string) { return this.service.listNationalities(page ?? 1, limit ?? 50, countryId); }
  @Get('currencies') async currencies(@Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string) { return this.service.listCurrencies(page ?? 1, limit ?? 50, search); }
  @Get('airlines') async airlines(@Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string) { return this.service.listAirlines(page ?? 1, limit ?? 50, search); }
  @Get('airports') async airports(@Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string) { return this.service.listAirports(page ?? 1, limit ?? 50, search); }
}

@ApiTags('Platform - Master Data') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, PlatformAdminGuard, PermissionsGuard)
@Controller('platform/master-data')
export class PlatformMasterDataController {
  constructor(private readonly service: MasterDataService) {}
  @Get('categories') @RequirePermissions('MASTER_DATA_READ') async getCategories() { return this.service.getCategories(); }
  @Get('categories/:id') @RequirePermissions('MASTER_DATA_READ') async getCategory(@Param('id') id: string) { return this.service.getCategory(id); }
  @Post('categories') @RequirePermissions('MASTER_DATA_CREATE') async createCategory(@Body() dto: CreateMasterDataCategoryDto) { return this.service.createCategory(dto); }
  @Put('categories/:id') @RequirePermissions('MASTER_DATA_UPDATE') async updateCategory(@Param('id') id: string, @Body() dto: UpdateMasterDataCategoryDto) { return this.service.updateCategory(id, dto); }
  @Delete('categories/:id') @RequirePermissions('MASTER_DATA_DELETE') async deleteCategory(@Param('id') id: string) { return this.service.deleteCategory(id); }
  @Get('items') @RequirePermissions('MASTER_DATA_READ') async getItems(@Query('categoryId') categoryId: string) { return this.service.getItems(categoryId); }
  @Get('items/:id') @RequirePermissions('MASTER_DATA_READ') async getItem(@Param('id') id: string) { return this.service.getItem(id); }
  @Post('items') @RequirePermissions('MASTER_DATA_CREATE') async createItem(@Body() dto: CreateMasterDataItemDto) { return this.service.createItem(dto.categoryId, dto); }
  @Put('items/:id') @RequirePermissions('MASTER_DATA_UPDATE') async updateItem(@Param('id') id: string, @Body() dto: UpdateMasterDataItemDto) { return this.service.updateItem(id, dto); }
  @Delete('items/:id') @RequirePermissions('MASTER_DATA_DELETE') async deleteItem(@Param('id') id: string) { return this.service.deleteItem(id); }
}

@ApiTags('Tenant - Master Data') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/master-data')
export class TenantMasterDataController {
  constructor(private readonly service: MasterDataService) {}
  @Get('lookup/:categoryCode') @RequirePermissions('MASTER_DATA_READ') async lookup(@TenantCtx() ctx: TenantContext, @Param('categoryCode') categoryCode: string, @Query('branchId') branchId?: string) { return this.service.getEffectiveData({ tenantId: ctx.tenantId, branchId, categoryCode }); }
  @Get('lookup') @RequirePermissions('MASTER_DATA_READ') async lookups(@TenantCtx() ctx: TenantContext, @Query('categories') categories: string, @Query('branchId') branchId?: string) { const codes = categories.split(',').map(c => c.trim()).filter(Boolean); return this.service.getEffectiveForCategories({ tenantId: ctx.tenantId, branchId, categoryCodes: codes }); }
  @Get('overrides/:categoryCode') @RequirePermissions('MASTER_DATA_READ') async getOverrides(@TenantCtx() ctx: TenantContext, @Param('categoryCode') categoryCode: string) { return this.service.getTenantOverrides(ctx.tenantId, categoryCode); }
  @Post('overrides') @RequirePermissions('MASTER_DATA_UPDATE') async upsertOverride(@TenantCtx() ctx: TenantContext, @Body() dto: UpsertTenantOverrideDto) { return this.service.upsertTenantOverride(ctx.tenantId, ctx.userId, dto); }
  @Post('overrides/hide') @RequirePermissions('MASTER_DATA_UPDATE') async hide(@TenantCtx() ctx: TenantContext, @Body() dto: HideRestoreItemDto) { return this.service.hideItem(ctx.tenantId, ctx.userId, dto.categoryCode, dto.code, dto.branchId); }
  @Post('overrides/restore') @RequirePermissions('MASTER_DATA_UPDATE') async restore(@TenantCtx() ctx: TenantContext, @Body() dto: HideRestoreItemDto) { return this.service.restoreItem(ctx.tenantId, ctx.userId, dto.categoryCode, dto.code, dto.branchId); }
  @Delete('overrides/:categoryCode/:code') @RequirePermissions('MASTER_DATA_DELETE') async deleteOverride(@TenantCtx() ctx: TenantContext, @Param('categoryCode') categoryCode: string, @Param('code') code: string, @Query('branchId') branchId?: string) { return this.service.deleteTenantOverride(ctx.tenantId, categoryCode, code, branchId); }
}
