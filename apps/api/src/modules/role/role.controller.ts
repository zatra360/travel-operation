import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RoleService } from './role.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantCtx } from '../../common/decorators/tenant-context.decorator';
import { TenantContext } from '../../common/interceptors/tenant-context.interceptor';

@ApiTags('Tenant - Roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @RequirePermissions('ROLE_CREATE')
  @ApiOperation({ summary: 'Create a new role' })
  async create(@TenantCtx() ctx: TenantContext, @Body() dto: CreateRoleDto) {
    return this.roleService.create(ctx.tenantId, dto);
  }

  @Get()
  @RequirePermissions('ROLE_READ')
  @ApiOperation({ summary: 'List roles for current tenant' })
  async findAll(@TenantCtx() ctx: TenantContext) {
    return this.roleService.findAll(ctx.tenantId);
  }

  @Get(':id')
  @RequirePermissions('ROLE_READ')
  @ApiOperation({ summary: 'Get role by ID' })
  async findById(@Param('id') id: string) {
    return this.roleService.findById(id);
  }

  @Put(':id')
  @RequirePermissions('ROLE_UPDATE')
  @ApiOperation({ summary: 'Update role and permissions' })
  async update(@Param('id') id: string, @Body() dto: CreateRoleDto) {
    return this.roleService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('ROLE_DELETE')
  @ApiOperation({ summary: 'Soft delete role' })
  async remove(@Param('id') id: string) {
    return this.roleService.remove(id);
  }
}
