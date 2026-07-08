import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { QuotationService } from './quotation.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { QueryQuotationDto } from './dto/query-quotation.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantCtx } from '../../common/decorators/tenant-context.decorator';
import { TenantContext } from '../../common/interceptors/tenant-context.interceptor';

@ApiTags('Tenant - Quotations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/quotations')
export class QuotationController {
  constructor(private readonly quotationService: QuotationService) {}

  @Post()
  @RequirePermissions('QUOTATION_CREATE')
  @ApiOperation({ summary: 'Create a new quotation' })
  async create(@TenantCtx() ctx: TenantContext, @Body() dto: CreateQuotationDto) {
    return this.quotationService.create(ctx.tenantId, ctx.userId, dto);
  }

  @Get()
  @RequirePermissions('QUOTATION_READ')
  @ApiOperation({ summary: 'List quotations for current tenant' })
  async findAll(@TenantCtx() ctx: TenantContext, @Query() query: QueryQuotationDto) {
    return this.quotationService.findAll(ctx.tenantId, query);
  }

  @Get(':id')
  @RequirePermissions('QUOTATION_READ')
  @ApiOperation({ summary: 'Get quotation by ID' })
  async findById(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.quotationService.findById(ctx.tenantId, id);
  }

  @Put(':id')
  @RequirePermissions('QUOTATION_UPDATE')
  @ApiOperation({ summary: 'Update quotation' })
  async update(
    @TenantCtx() ctx: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateQuotationDto,
  ) {
    return this.quotationService.update(ctx.tenantId, ctx.userId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('QUOTATION_DELETE')
  @ApiOperation({ summary: 'Soft delete quotation' })
  async remove(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.quotationService.remove(ctx.tenantId, ctx.userId, id);
  }
}
