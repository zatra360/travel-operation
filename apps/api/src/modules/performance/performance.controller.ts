import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PerformanceService } from './performance.service';
import { CreatePerformanceDto } from './dto/create-performance.dto';
import { UpdatePerformanceDto } from './dto/update-performance.dto';
import { QueryPerformanceDto } from './dto/query-performance.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantCtx } from '../../common/decorators/tenant-context.decorator';
import { TenantContext } from '../../common/interceptors/tenant-context.interceptor';

@ApiTags('Tenant - Performance') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/performance')
export class PerformanceController {
  constructor(private readonly performanceService: PerformanceService) {}
  @Post() @RequirePermissions('PERFORMANCE_CREATE') @ApiOperation({ summary: 'Create performance review' }) async create(@TenantCtx() ctx: TenantContext, @Body() dto: CreatePerformanceDto) { return this.performanceService.create(ctx.tenantId, ctx.userId, dto); }
  @Get() @RequirePermissions('PERFORMANCE_READ') @ApiOperation({ summary: 'List reviews' }) async findAll(@TenantCtx() ctx: TenantContext, @Query() query: QueryPerformanceDto) { return this.performanceService.findAll(ctx.tenantId, query); }
  @Get(':id') @RequirePermissions('PERFORMANCE_READ') @ApiOperation({ summary: 'Get review' }) async findById(@TenantCtx() ctx: TenantContext, @Param('id') id: string) { return this.performanceService.findById(ctx.tenantId, id); }
  @Put(':id') @RequirePermissions('PERFORMANCE_UPDATE') @ApiOperation({ summary: 'Update review' }) async update(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: UpdatePerformanceDto) { return this.performanceService.update(ctx.tenantId, ctx.userId, id, dto); }
  @Delete(':id') @RequirePermissions('PERFORMANCE_DELETE') @ApiOperation({ summary: 'Delete review' }) async remove(@TenantCtx() ctx: TenantContext, @Param('id') id: string) { return this.performanceService.remove(ctx.tenantId, ctx.userId, id); }
}
