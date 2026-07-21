import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
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
  constructor(
    private readonly tenantService: TenantService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

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

  @Post(':tenantId/impersonate/:userId')
  @ApiOperation({ summary: 'Impersonate a tenant user (platform admin only)' })
  async impersonate(@Param('tenantId') tenantId: string, @Param('userId') userId: string) {
    const user = await this.prisma.user.findFirstOrThrow({ where: { id: userId } });
    const token = this.jwtService.sign({ sub: user.id, email: user.email, isPlatformSuperAdmin: false });
    return { accessToken: token, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName } };
  }
}
