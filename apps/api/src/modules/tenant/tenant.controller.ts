import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Platform - Tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PlatformAdminGuard, PermissionsGuard)
@Controller('platform/tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  @RequirePermissions('TENANT_CREATE')
  @ApiOperation({ summary: 'Create a new tenant' })
  async create(@Body() dto: CreateTenantDto) {
    return this.tenantService.create(dto);
  }

  @Get()
  @RequirePermissions('TENANT_READ')
  @ApiOperation({ summary: 'List tenants with pagination, filter, and stats' })
  async findAll(@Query('page') page?: number, @Query('limit') limit?: number, @Query('status') status?: string, @Query('search') search?: string) {
    return this.tenantService.findAll(page ?? 1, limit ?? 20, status, search);
  }

  @Get(':id')
  @RequirePermissions('TENANT_READ')
  @ApiOperation({ summary: 'Get tenant by ID' })
  async findById(@Param('id') id: string) {
    return this.tenantService.findById(id);
  }

  @Put(':id')
  @RequirePermissions('TENANT_UPDATE')
  @ApiOperation({ summary: 'Update tenant' })
  async update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.tenantService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('TENANT_DELETE')
  @ApiOperation({ summary: 'Soft delete tenant' })
  async remove(@Param('id') id: string) {
    return this.tenantService.remove(id);
  }
}
