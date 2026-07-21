import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InvoiceService } from './invoice.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { QueryInvoiceDto } from './dto/query-invoice.dto';
import { JwtAuthGuard, TenantGuard, PermissionsGuard, RequirePermissions, TenantCtx, TenantContext } from '../../common';

@ApiTags('Tenant - Invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post()
  @RequirePermissions('INVOICE_CREATE')
  @ApiOperation({ summary: 'Create invoice' })
  async create(@TenantCtx() ctx: TenantContext, @Body() dto: CreateInvoiceDto) {
    return this.invoiceService.create(ctx.tenantId, ctx.userId, dto);
  }

  @Get()
  @RequirePermissions('INVOICE_READ')
  @ApiOperation({ summary: 'List invoices' })
  async findAll(@TenantCtx() ctx: TenantContext, @Query() query: QueryInvoiceDto) {
    return this.invoiceService.findAll(ctx.tenantId, query, ctx.branchId);
  }

  @Get(':id')
  @RequirePermissions('INVOICE_READ')
  @ApiOperation({ summary: 'Get invoice with lines, payments, receipts' })
  async findById(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.invoiceService.findById(ctx.tenantId, id);
  }

  @Put(':id')
  @RequirePermissions('INVOICE_UPDATE')
  @ApiOperation({ summary: 'Update invoice' })
  async update(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: UpdateInvoiceDto) {
    return this.invoiceService.update(ctx.tenantId, ctx.userId, id, dto);
  }

  @Post(':id/void')
  @RequirePermissions('INVOICE_DELETE')
  @ApiOperation({ summary: 'Void/cancel invoice' })
  async void(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.invoiceService.void(ctx.tenantId, ctx.userId, id);
  }

  @Post(':id/add-line')
  @RequirePermissions('INVOICE_UPDATE')
  @ApiOperation({ summary: 'Add line item' })
  async addLine(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: any) {
    return this.invoiceService.addLine(ctx.tenantId, ctx.userId, id, dto);
  }

  @Delete(':id/lines/:lineId')
  @RequirePermissions('INVOICE_UPDATE')
  @ApiOperation({ summary: 'Remove line item' })
  async removeLine(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Param('lineId') lineId: string) {
    return this.invoiceService.removeLine(ctx.tenantId, ctx.userId, id, lineId);
  }

  @Get(':id/timeline')
  @RequirePermissions('INVOICE_READ')
  @ApiOperation({ summary: 'Get invoice activity timeline' })
  async getTimeline(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.invoiceService.getTimeline(ctx.tenantId, id);
  }

  @Get(':id/ledger')
  @RequirePermissions('INVOICE_READ')
  @ApiOperation({ summary: 'Get related ledger entries' })
  async getLedger(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.invoiceService.getLedger(ctx.tenantId, id);
  }

  @Delete(':id')
  @RequirePermissions('INVOICE_DELETE')
  @ApiOperation({ summary: 'Soft delete invoice' })
  async remove(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.invoiceService.remove(ctx.tenantId, ctx.userId, id);
  }
}
