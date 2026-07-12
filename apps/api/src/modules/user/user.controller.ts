import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantCtx } from '../../common/decorators/tenant-context.decorator';
import { TenantContext } from '../../common/interceptors/tenant-context.interceptor';

@ApiTags('Platform - Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PlatformAdminGuard, PermissionsGuard)
@Controller('platform/users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @RequirePermissions('USER_CREATE')
  @ApiOperation({ summary: 'Create a new user' })
  async create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  @Get()
  @RequirePermissions('USER_READ')
  @ApiOperation({ summary: 'List all platform users' })
  async findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  @RequirePermissions('USER_READ')
  @ApiOperation({ summary: 'Get user by ID' })
  async findById(@Param('id') id: string) {
    return this.userService.findById(id);
  }

  @Put(':id')
  @RequirePermissions('USER_UPDATE')
  @ApiOperation({ summary: 'Update user' })
  async update(@Param('id') id: string, @Body() dto: Partial<CreateUserDto>) {
    return this.userService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('USER_DELETE')
  @ApiOperation({ summary: 'Soft delete user' })
  async remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}

@ApiTags('Tenant - Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/users')
export class TenantUserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @RequirePermissions('USER_READ')
  @ApiOperation({ summary: 'List users in current tenant' })
  async findByTenant(@TenantCtx() ctx: TenantContext) {
    return this.userService.findByTenant(ctx.tenantId);
  }

  @Post(':userId')
  @RequirePermissions('USER_CREATE')
  @ApiOperation({ summary: 'Add a user to the current tenant' })
  async addToTenant(@TenantCtx() ctx: TenantContext, @Param('userId') userId: string, @Body('role') role?: string) {
    return this.userService.addToTenant(ctx.tenantId, userId, role);
  }

  @Delete(':userId')
  @RequirePermissions('USER_DELETE')
  @ApiOperation({ summary: 'Remove a user from the current tenant' })
  async removeFromTenant(@TenantCtx() ctx: TenantContext, @Param('userId') userId: string) {
    await this.userService.removeFromTenant(ctx.tenantId, userId);
    return { removed: true };
  }
}
