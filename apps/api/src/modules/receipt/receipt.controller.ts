import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReceiptService } from './receipt.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { UpdateReceiptDto } from './dto/update-receipt.dto';
import { QueryReceiptDto } from './dto/query-receipt.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantCtx } from '../../common/decorators/tenant-context.decorator';
import { TenantContext } from '../../common/interceptors/tenant-context.interceptor';

@ApiTags('Tenant - Receipts') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/receipts')
export class ReceiptController {
  constructor(private readonly receiptService: ReceiptService) {}

  @Post() @RequirePermissions('RECEIPT_CREATE') @ApiOperation({ summary: 'Create a receipt' })
  async create(@TenantCtx() ctx: TenantContext, @Body() dto: CreateReceiptDto) { return this.receiptService.create(ctx.tenantId, ctx.userId, dto); }

  @Get() @RequirePermissions('RECEIPT_READ') @ApiOperation({ summary: 'List receipts' })
  async findAll(@TenantCtx() ctx: TenantContext, @Query() query: QueryReceiptDto) { return this.receiptService.findAll(ctx.tenantId, query); }

  @Get(':id') @RequirePermissions('RECEIPT_READ') @ApiOperation({ summary: 'Get receipt' })
  async findById(@TenantCtx() ctx: TenantContext, @Param('id') id: string) { return this.receiptService.findById(ctx.tenantId, id); }

  @Put(':id') @RequirePermissions('RECEIPT_UPDATE') @ApiOperation({ summary: 'Update receipt' })
  async update(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: UpdateReceiptDto) { return this.receiptService.update(ctx.tenantId, ctx.userId, id, dto); }
}
