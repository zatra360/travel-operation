import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { QuotationService } from './quotation.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { QueryQuotationDto } from './dto/query-quotation.dto';
import { JwtAuthGuard, TenantGuard, PermissionsGuard, RequirePermissions, TenantCtx, TenantContext } from '../../common';

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
  @ApiOperation({ summary: 'List quotations' })
  async findAll(@TenantCtx() ctx: TenantContext, @Query() query: QueryQuotationDto) {
    return this.quotationService.findAll(ctx.tenantId, query);
  }

  @Get(':id')
  @RequirePermissions('QUOTATION_READ')
  @ApiOperation({ summary: 'Get quotation by ID' })
  async findById(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.quotationService.findById(ctx.tenantId, id, true);
  }

  @Put(':id')
  @RequirePermissions('QUOTATION_UPDATE')
  @ApiOperation({ summary: 'Update quotation' })
  async update(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: UpdateQuotationDto) {
    return this.quotationService.update(ctx.tenantId, ctx.userId, id, dto);
  }

  @Post(':id/send')
  @RequirePermissions('QUOTATION_UPDATE')
  @ApiOperation({ summary: 'Send quotation to client' })
  async send(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.quotationService.send(ctx.tenantId, ctx.userId, id);
  }

  @Post(':id/accept')
  @RequirePermissions('QUOTATION_UPDATE')
  @ApiOperation({ summary: 'Accept quotation' })
  async accept(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.quotationService.accept(ctx.tenantId, ctx.userId, id);
  }

  @Post(':id/reject')
  @RequirePermissions('QUOTATION_UPDATE')
  @ApiOperation({ summary: 'Reject quotation' })
  async reject(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.quotationService.reject(ctx.tenantId, ctx.userId, id);
  }

  @Post(':id/cancel')
  @RequirePermissions('QUOTATION_UPDATE')
  @ApiOperation({ summary: 'Cancel quotation' })
  async cancel(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.quotationService.cancel(ctx.tenantId, ctx.userId, id);
  }

  @Post(':id/convert-to-booking')
  @RequirePermissions('BOOKING_CREATE')
  @ApiOperation({ summary: 'Convert quotation to booking' })
  async convertToBooking(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.quotationService.convertToBooking(ctx.tenantId, ctx.userId, id);
  }

  @Post(':id/convert-to-invoice')
  @RequirePermissions('INVOICE_CREATE')
  @ApiOperation({ summary: 'Convert quotation to invoice' })
  async convertToInvoice(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.quotationService.convertToInvoice(ctx.tenantId, ctx.userId, id);
  }

  @Post(':id/line-items')
  @RequirePermissions('QUOTATION_UPDATE')
  @ApiOperation({ summary: 'Add line item to quotation' })
  async addLineItem(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: any) {
    return this.quotationService.addLineItem(ctx.tenantId, ctx.userId, id, dto);
  }

  @Delete(':id/line-items/:lineItemId')
  @RequirePermissions('QUOTATION_UPDATE')
  @ApiOperation({ summary: 'Remove line item' })
  async removeLineItem(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Param('lineItemId') lineItemId: string) {
    return this.quotationService.removeLineItem(ctx.tenantId, ctx.userId, id, lineItemId);
  }

  @Get(':id/timeline')
  @RequirePermissions('QUOTATION_READ')
  @ApiOperation({ summary: 'Get quotation activity timeline' })
  async getTimeline(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.quotationService.getTimeline(ctx.tenantId, id);
  }

  @Get(':id/revisions')
  @RequirePermissions('QUOTATION_READ')
  @ApiOperation({ summary: 'Get revision history' })
  async getRevisions(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.quotationService.getRevisionHistory(ctx.tenantId, id);
  }

  @Delete(':id')
  @RequirePermissions('QUOTATION_DELETE')
  @ApiOperation({ summary: 'Soft delete quotation' })
  async remove(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.quotationService.remove(ctx.tenantId, ctx.userId, id);
  }
}
