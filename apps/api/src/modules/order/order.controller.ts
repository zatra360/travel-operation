import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrderService } from './order.service';
import { CreateOrderDto, CreateOrderItemDto, UpdateOrderItemDto } from './dto/order.dto';
import { JwtAuthGuard, TenantGuard, PermissionsGuard, RequirePermissions, TenantCtx, TenantContext } from '../../common';

@ApiTags('Tenant - Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/orders')
export class OrderListController {
  constructor(private readonly service: OrderService) {}
  @Get() @RequirePermissions('ORDER_READ') async findAll(@TenantCtx() ctx: TenantContext, @Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string) { return this.service.findAll(ctx.tenantId, { page, limit, search }); }
}

@ApiTags('Tenant - Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/clients/:clientId/orders')
export class OrderController {
  constructor(private readonly service: OrderService) {}

  @Post() @RequirePermissions('ORDER_CREATE')
  @ApiOperation({ summary: 'Create order' })
  create(@TenantCtx() ctx: TenantContext, @Param('clientId') clientId: string, @Body() dto: CreateOrderDto) {
    return this.service.create(ctx.tenantId, clientId, ctx.userId, dto);
  }

  @Get() @RequirePermissions('ORDER_READ')
  @ApiOperation({ summary: 'List client orders' })
  findByClient(@TenantCtx() ctx: TenantContext, @Param('clientId') clientId: string) {
    return this.service.findByClient(ctx.tenantId, clientId);
  }

  @Get(':id') @RequirePermissions('ORDER_READ')
  @ApiOperation({ summary: 'Get order detail' })
  findOne(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.service.findOne(ctx.tenantId, id);
  }

  @Put(':id') @RequirePermissions('ORDER_UPDATE')
  @ApiOperation({ summary: 'Update order' })
  update(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: any) {
    return this.service.update(ctx.tenantId, id, dto);
  }

  @Post(':id/items') @RequirePermissions('ORDER_UPDATE')
  @ApiOperation({ summary: 'Add order item' })
  addItem(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: CreateOrderItemDto) {
    return this.service.addItem(ctx.tenantId, id, dto);
  }

  @Put(':id/items/:itemId') @RequirePermissions('ORDER_UPDATE')
  @ApiOperation({ summary: 'Update order item' })
  updateItem(@TenantCtx() ctx: TenantContext, @Param('itemId') itemId: string, @Body() dto: UpdateOrderItemDto) {
    return this.service.updateItem(ctx.tenantId, itemId, dto);
  }

  @Delete(':id/items/:itemId') @RequirePermissions('ORDER_UPDATE')
  @ApiOperation({ summary: 'Remove order item' })
  removeItem(@TenantCtx() ctx: TenantContext, @Param('itemId') itemId: string) {
    return this.service.removeItem(ctx.tenantId, itemId);
  }

  @Delete(':id') @RequirePermissions('ORDER_DELETE')
  @ApiOperation({ summary: 'Cancel order' })
  remove(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.service.remove(ctx.tenantId, id);
  }
}
