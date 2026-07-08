import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InvoiceService } from './invoice.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { QueryInvoiceDto } from './dto/query-invoice.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantCtx } from '../../common/decorators/tenant-context.decorator';
import { TenantContext } from '../../common/interceptors/tenant-context.interceptor';

@ApiTags('Tenant - Invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post() @RequirePermissions('INVOICE_CREATE') @ApiOperation({ summary: 'Create a new invoice' })
  async create(@TenantCtx() ctx: TenantContext, @Body() dto: CreateInvoiceDto) { return this.invoiceService.create(ctx.tenantId, ctx.userId, dto); }

  @Get() @RequirePermissions('INVOICE_READ') @ApiOperation({ summary: 'List invoices' })
  async findAll(@TenantCtx() ctx: TenantContext, @Query() query: QueryInvoiceDto) { return this.invoiceService.findAll(ctx.tenantId, query); }

  @Get(':id') @RequirePermissions('INVOICE_READ') @ApiOperation({ summary: 'Get invoice by ID' })
  async findById(@TenantCtx() ctx: TenantContext, @Param('id') id: string) { return this.invoiceService.findById(ctx.tenantId, id); }

  @Put(':id') @RequirePermissions('INVOICE_UPDATE') @ApiOperation({ summary: 'Update invoice' })
  async update(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: UpdateInvoiceDto) { return this.invoiceService.update(ctx.tenantId, ctx.userId, id, dto); }

  @Delete(':id') @RequirePermissions('INVOICE_DELETE') @ApiOperation({ summary: 'Soft delete invoice' })
  async remove(@TenantCtx() ctx: TenantContext, @Param('id') id: string) { return this.invoiceService.remove(ctx.tenantId, ctx.userId, id); }
}
