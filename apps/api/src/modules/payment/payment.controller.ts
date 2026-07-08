import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { QueryPaymentDto } from './dto/query-payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantCtx } from '../../common/decorators/tenant-context.decorator';
import { TenantContext } from '../../common/interceptors/tenant-context.interceptor';

@ApiTags('Tenant - Payments') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post() @RequirePermissions('PAYMENT_CREATE') @ApiOperation({ summary: 'Create a payment' })
  async create(@TenantCtx() ctx: TenantContext, @Body() dto: CreatePaymentDto) { return this.paymentService.create(ctx.tenantId, ctx.userId, dto); }

  @Get() @RequirePermissions('PAYMENT_READ') @ApiOperation({ summary: 'List payments' })
  async findAll(@TenantCtx() ctx: TenantContext, @Query() query: QueryPaymentDto) { return this.paymentService.findAll(ctx.tenantId, query); }

  @Get(':id') @RequirePermissions('PAYMENT_READ') @ApiOperation({ summary: 'Get payment' })
  async findById(@TenantCtx() ctx: TenantContext, @Param('id') id: string) { return this.paymentService.findById(ctx.tenantId, id); }

  @Put(':id') @RequirePermissions('PAYMENT_UPDATE') @ApiOperation({ summary: 'Update payment' })
  async update(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: UpdatePaymentDto) { return this.paymentService.update(ctx.tenantId, ctx.userId, id, dto); }

  @Delete(':id') @RequirePermissions('PAYMENT_DELETE') @ApiOperation({ summary: 'Delete payment' })
  async remove(@TenantCtx() ctx: TenantContext, @Param('id') id: string) { return this.paymentService.remove(ctx.tenantId, ctx.userId, id); }
}
