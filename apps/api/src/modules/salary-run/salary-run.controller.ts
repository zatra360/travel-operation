import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SalaryRunService } from './salary-run.service';
import { CreateSalaryRunDto } from './dto/create-salary-run.dto';
import { UpdateSalaryRunDto } from './dto/update-salary-run.dto';
import { QuerySalaryRunDto } from './dto/query-salary-run.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantCtx } from '../../common/decorators/tenant-context.decorator';
import { TenantContext } from '../../common/interceptors/tenant-context.interceptor';

@ApiTags('Tenant - Salary Runs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/salary-runs')
export class SalaryRunController {
  constructor(private readonly salaryRunService: SalaryRunService) {}

  @Post()
  @RequirePermissions('SALARY_RUN_CREATE')
  @ApiOperation({ summary: 'Create a salary run' })
  async create(@TenantCtx() ctx: TenantContext, @Body() dto: CreateSalaryRunDto) {
    return this.salaryRunService.create(ctx.tenantId, ctx.userId, dto);
  }

  @Get()
  @RequirePermissions('SALARY_RUN_READ')
  @ApiOperation({ summary: 'List salary runs' })
  async findAll(@TenantCtx() ctx: TenantContext, @Query() query: QuerySalaryRunDto) {
    return this.salaryRunService.findAll(ctx.tenantId, query, ctx.branchId);
  }

  @Get(':id')
  @RequirePermissions('SALARY_RUN_READ')
  @ApiOperation({ summary: 'Get salary run by ID' })
  async findById(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.salaryRunService.findById(ctx.tenantId, id);
  }

  @Put(':id')
  @RequirePermissions('SALARY_RUN_UPDATE')
  @ApiOperation({ summary: 'Update salary run' })
  async update(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: UpdateSalaryRunDto) {
    return this.salaryRunService.update(ctx.tenantId, ctx.userId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('SALARY_RUN_DELETE')
  @ApiOperation({ summary: 'Soft delete salary run' })
  async remove(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.salaryRunService.remove(ctx.tenantId, ctx.userId, id);
  }

  @Post(':id/generate-slips')
  @RequirePermissions('SALARY_RUN_UPDATE')
  @ApiOperation({ summary: 'Generate salary slips for all active employees' })
  async generateSlips(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.salaryRunService.generateSlips(ctx.tenantId, ctx.userId, id);
  }

  @Post(':id/approve')
  @RequirePermissions('SALARY_RUN_UPDATE')
  @ApiOperation({ summary: 'Approve salary run' })
  async approve(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.salaryRunService.approve(ctx.tenantId, ctx.userId, id);
  }

  @Post(':id/cancel')
  @RequirePermissions('SALARY_RUN_UPDATE')
  @ApiOperation({ summary: 'Cancel salary run' })
  async cancel(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.salaryRunService.cancel(ctx.tenantId, ctx.userId, id);
  }

  @Get(':id/timeline')
  @RequirePermissions('SALARY_RUN_READ')
  @ApiOperation({ summary: 'Get salary run activity timeline' })
  async getTimeline(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.salaryRunService.getTimeline(ctx.tenantId, id);
  }
}
