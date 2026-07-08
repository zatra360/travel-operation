import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MasterDataService } from './master-data.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Tenant - Master Data') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/master-data')
export class MasterDataController {
  constructor(private readonly service: MasterDataService) {}

  @Get('countries') @RequirePermissions('MASTER_DATA_READ') @ApiOperation({ summary: 'List countries' }) async countries(@Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string) { return this.service.listCountries(page ?? 1, limit ?? 50, search); }
  @Get('countries/:id') @RequirePermissions('MASTER_DATA_READ') @ApiOperation({ summary: 'Get country' }) async country(@Param('id') id: string) { return this.service.getCountry(id); }

  @Get('nationalities') @RequirePermissions('MASTER_DATA_READ') @ApiOperation({ summary: 'List nationalities' }) async nationalities(@Query('page') page?: number, @Query('limit') limit?: number, @Query('countryId') countryId?: string) { return this.service.listNationalities(page ?? 1, limit ?? 50, countryId); }

  @Get('currencies') @RequirePermissions('MASTER_DATA_READ') @ApiOperation({ summary: 'List currencies' }) async currencies(@Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string) { return this.service.listCurrencies(page ?? 1, limit ?? 50, search); }

  @Get('airlines') @RequirePermissions('MASTER_DATA_READ') @ApiOperation({ summary: 'List airlines' }) async airlines(@Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string) { return this.service.listAirlines(page ?? 1, limit ?? 50, search); }

  @Get('airports') @RequirePermissions('MASTER_DATA_READ') @ApiOperation({ summary: 'List airports' }) async airports(@Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string) { return this.service.listAirports(page ?? 1, limit ?? 50, search); }
}
