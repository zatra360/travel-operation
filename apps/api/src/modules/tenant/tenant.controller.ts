import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Platform - Tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
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
  @ApiOperation({ summary: 'List all tenants' })
  async findAll() {
    return this.tenantService.findAll();
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
