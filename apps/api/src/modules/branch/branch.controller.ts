import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BranchService } from './branch.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantCtx } from '../../common/decorators/tenant-context.decorator';
import { TenantContext } from '../../common/interceptors/tenant-context.interceptor';

@ApiTags('Tenant - Branches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/branches')
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  @Post()
  @RequirePermissions('BRANCH_CREATE')
  @ApiOperation({ summary: 'Create a new branch' })
  async create(@TenantCtx() ctx: TenantContext, @Body() dto: CreateBranchDto) {
    return this.branchService.create(ctx.tenantId, dto);
  }

  @Get()
  @RequirePermissions('BRANCH_READ')
  @ApiOperation({ summary: 'List branches for current tenant' })
  async findAll(@TenantCtx() ctx: TenantContext) {
    return this.branchService.findAll(ctx.tenantId);
  }

  @Get(':id')
  @RequirePermissions('BRANCH_READ')
  @ApiOperation({ summary: 'Get branch by ID' })
  async findById(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.branchService.findById(ctx.tenantId, id);
  }

  @Put(':id')
  @RequirePermissions('BRANCH_UPDATE')
  @ApiOperation({ summary: 'Update branch' })
  async update(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: { name?: string; address?: string; phone?: string; email?: string }) {
    return this.branchService.update(ctx.tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('BRANCH_DELETE')
  @ApiOperation({ summary: 'Soft delete branch' })
  async remove(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.branchService.remove(ctx.tenantId, id);
  }
}
