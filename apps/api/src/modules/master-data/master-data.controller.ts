import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
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
  @Get('cabin-classes') async cabinClasses(@Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string) { return this.service.listCabinClasses(page ?? 1, limit ?? 50, search); }
  @Get('aircraft-types') async aircraftTypes(@Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string) { return this.service.listAircraftTypes(page ?? 1, limit ?? 50, search); }
  @Get('airline-alliances') async airlineAlliances(@Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string) { return this.service.listAirlineAlliances(page ?? 1, limit ?? 50, search); }
  @Get('airport-terminals') async airportTerminals(@Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string) { return this.service.listAirportTerminals(page ?? 1, limit ?? 50, search); }
  @Get('timezones') async timezones(@Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string) { return this.service.listTimezones(page ?? 1, limit ?? 50, search); }
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
  @Get('items') @RequirePermissions('MASTER_DATA_READ') async getItems(@Query('categoryId') categoryId: string, @Query('search') search?: string, @Query('page') page?: number, @Query('limit') limit?: number) { return this.service.getItems(categoryId, { search, page: page ?? 1, limit: limit ?? 50 }); }
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
  @Get('lookup/:categoryCode') @RequirePermissions('MASTER_DATA_READ') @Throttle({ default: { ttl: 60000, limit: 120 } }) async lookup(@TenantCtx() ctx: TenantContext, @Param('categoryCode') categoryCode: string, @Query('branchId') branchId?: string) { return this.service.getEffectiveData({ tenantId: ctx.tenantId, branchId, categoryCode }); }
  @Get('lookup') @RequirePermissions('MASTER_DATA_READ') @Throttle({ default: { ttl: 60000, limit: 120 } }) async lookups(@TenantCtx() ctx: TenantContext, @Query('categories') categories: string, @Query('branchId') branchId?: string) { const codes = categories.split(',').map(c => c.trim()).filter(Boolean); return this.service.getEffectiveForCategories({ tenantId: ctx.tenantId, branchId, categoryCodes: codes }); }
  @Get('overrides/:categoryCode') @RequirePermissions('MASTER_DATA_READ') async getOverrides(@TenantCtx() ctx: TenantContext, @Param('categoryCode') categoryCode: string) { return this.service.getTenantOverrides(ctx.tenantId, categoryCode); }
  @Post('overrides') @RequirePermissions('MASTER_DATA_UPDATE') async upsertOverride(@TenantCtx() ctx: TenantContext, @Body() dto: UpsertTenantOverrideDto) { return this.service.upsertTenantOverride(ctx.tenantId, ctx.userId, dto); }
  @Post('overrides/hide') @RequirePermissions('MASTER_DATA_UPDATE') async hide(@TenantCtx() ctx: TenantContext, @Body() dto: HideRestoreItemDto) { return this.service.hideItem(ctx.tenantId, ctx.userId, dto.categoryCode, dto.code, dto.branchId); }
  @Post('overrides/restore') @RequirePermissions('MASTER_DATA_UPDATE') async restore(@TenantCtx() ctx: TenantContext, @Body() dto: HideRestoreItemDto) { return this.service.restoreItem(ctx.tenantId, ctx.userId, dto.categoryCode, dto.code, dto.branchId); }
  @Delete('overrides/:categoryCode/:code') @RequirePermissions('MASTER_DATA_DELETE') async deleteOverride(@TenantCtx() ctx: TenantContext, @Param('categoryCode') categoryCode: string, @Param('code') code: string, @Query('branchId') branchId?: string) { return this.service.deleteTenantOverride(ctx.tenantId, categoryCode, code, branchId); }
}

@ApiTags('Platform - Reference Data') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, PlatformAdminGuard, PermissionsGuard)
@Controller('platform/reference-data')
export class PlatformReferenceDataController {
  constructor(private readonly service: MasterDataService) {}

  @Post('countries') @RequirePermissions('MASTER_DATA_CREATE') async createCountry(@Body() dto: any) { return this.service.createCountry(dto); }
  @Put('countries/:id') @RequirePermissions('MASTER_DATA_UPDATE') async updateCountry(@Param('id') id: string, @Body() dto: any) { return this.service.updateCountry(id, dto); }
  @Delete('countries/:id') @RequirePermissions('MASTER_DATA_DELETE') async deleteCountry(@Param('id') id: string) { return this.service.deleteCountry(id); }

  @Post('airlines') @RequirePermissions('MASTER_DATA_CREATE') async createAirline(@Body() dto: any) { return this.service.createAirline(dto); }
  @Put('airlines/:id') @RequirePermissions('MASTER_DATA_UPDATE') async updateAirline(@Param('id') id: string, @Body() dto: any) { return this.service.updateAirline(id, dto); }
  @Delete('airlines/:id') @RequirePermissions('MASTER_DATA_DELETE') async deleteAirline(@Param('id') id: string) { return this.service.deleteAirline(id); }

  @Post('airports') @RequirePermissions('MASTER_DATA_CREATE') async createAirport(@Body() dto: any) { return this.service.createAirport(dto); }
  @Put('airports/:id') @RequirePermissions('MASTER_DATA_UPDATE') async updateAirport(@Param('id') id: string, @Body() dto: any) { return this.service.updateAirport(id, dto); }
  @Delete('airports/:id') @RequirePermissions('MASTER_DATA_DELETE') async deleteAirport(@Param('id') id: string) { return this.service.deleteAirport(id); }

  @Post('currencies') @RequirePermissions('MASTER_DATA_CREATE') async createCurrency(@Body() dto: any) { return this.service.createCurrency(dto); }
  @Put('currencies/:id') @RequirePermissions('MASTER_DATA_UPDATE') async updateCurrency(@Param('id') id: string, @Body() dto: any) { return this.service.updateCurrency(id, dto); }
  @Delete('currencies/:id') @RequirePermissions('MASTER_DATA_DELETE') async deleteCurrency(@Param('id') id: string) { return this.service.deleteCurrency(id); }

  @Post('cabin-classes') @RequirePermissions('MASTER_DATA_CREATE') async createCabinClass(@Body() dto: any) { return this.service.createCabinClass(dto); }
  @Put('cabin-classes/:id') @RequirePermissions('MASTER_DATA_UPDATE') async updateCabinClass(@Param('id') id: string, @Body() dto: any) { return this.service.updateCabinClass(id, dto); }
  @Delete('cabin-classes/:id') @RequirePermissions('MASTER_DATA_DELETE') async deleteCabinClass(@Param('id') id: string) { return this.service.deleteCabinClass(id); }

  @Post('nationalities') @RequirePermissions('MASTER_DATA_CREATE') async createNationality(@Body() dto: any) { return this.service.createNationality(dto); }
  @Put('nationalities/:id') @RequirePermissions('MASTER_DATA_UPDATE') async updateNationality(@Param('id') id: string, @Body() dto: any) { return this.service.updateNationality(id, dto); }
  @Delete('nationalities/:id') @RequirePermissions('MASTER_DATA_DELETE') async deleteNationality(@Param('id') id: string) { return this.service.deleteNationality(id); }
}
