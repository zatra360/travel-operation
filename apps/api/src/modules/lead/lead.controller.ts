import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LeadService } from './lead.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { QueryLeadDto } from './dto/query-lead.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantCtx } from '../../common/decorators/tenant-context.decorator';
import { TenantContext } from '../../common/interceptors/tenant-context.interceptor';

@ApiTags('Tenant - Leads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/leads')
export class LeadController {
  constructor(private readonly leadService: LeadService) {}

  @Post()
  @RequirePermissions('LEAD_CREATE')
  @ApiOperation({ summary: 'Create a new lead' })
  async create(@TenantCtx() ctx: TenantContext, @Body() dto: CreateLeadDto) {
    return this.leadService.create(ctx.tenantId, ctx.userId, dto);
  }

  @Get()
  @RequirePermissions('LEAD_READ')
  @ApiOperation({ summary: 'List leads for current tenant' })
  async findAll(@TenantCtx() ctx: TenantContext, @Query() query: QueryLeadDto) {
    return this.leadService.findAll(ctx.tenantId, query);
  }

  @Get(':id')
  @RequirePermissions('LEAD_READ')
  @ApiOperation({ summary: 'Get lead by ID' })
  async findById(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.leadService.findById(ctx.tenantId, id);
  }

  @Put(':id')
  @RequirePermissions('LEAD_UPDATE')
  @ApiOperation({ summary: 'Update lead' })
  async update(
    @TenantCtx() ctx: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
  ) {
    return this.leadService.update(ctx.tenantId, ctx.userId, id, dto);
  }

  @Post(':id/convert')
  @RequirePermissions('LEAD_UPDATE')
  @ApiOperation({ summary: 'Convert lead to client' })
  async convert(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.leadService.convertToClient(ctx.tenantId, ctx.userId, id);
  }

  @Delete(':id')
  @RequirePermissions('LEAD_DELETE')
  @ApiOperation({ summary: 'Soft delete lead' })
  async remove(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.leadService.remove(ctx.tenantId, ctx.userId, id);
  }
}
