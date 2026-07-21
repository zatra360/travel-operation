import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ServiceCatalogService } from './service-catalog.service';
import { CreateCategoryDto, CreateItemDto, UpdateItemDto } from './dto/service-catalog.dto';
import { JwtAuthGuard, TenantGuard, PermissionsGuard, RequirePermissions, TenantCtx, TenantContext } from '../../common';

@ApiTags('Tenant - Service Catalog')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/service-catalog')
export class ServiceCatalogController {
  constructor(private readonly service: ServiceCatalogService) {}

  @Post('categories')
  @RequirePermissions('SETTINGS_UPDATE')
  @ApiOperation({ summary: 'Create service category' })
  createCategory(@TenantCtx() ctx: TenantContext, @Body() dto: CreateCategoryDto) {
    return this.service.createCategory(ctx.tenantId, dto);
  }

  @Get('categories')
  @RequirePermissions('SETTINGS_READ')
  @ApiOperation({ summary: 'List service categories with items' })
  listCategories(@TenantCtx() ctx: TenantContext) {
    return this.service.listCategories(ctx.tenantId);
  }

  @Post('items')
  @RequirePermissions('SETTINGS_UPDATE')
  @ApiOperation({ summary: 'Create service item' })
  createItem(@TenantCtx() ctx: TenantContext, @Body() dto: CreateItemDto) {
    return this.service.createItem(ctx.tenantId, dto);
  }

  @Get('items')
  @RequirePermissions('SETTINGS_READ')
  @ApiOperation({ summary: 'List service items' })
  listItems(@TenantCtx() ctx: TenantContext, @Query('categoryId') categoryId?: string) {
    return this.service.listItems(ctx.tenantId, categoryId);
  }

  @Put('items/:id')
  @RequirePermissions('SETTINGS_UPDATE')
  @ApiOperation({ summary: 'Update service item' })
  updateItem(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: UpdateItemDto) {
    return this.service.updateItem(ctx.tenantId, id, dto);
  }

  @Delete('items/:id')
  @RequirePermissions('SETTINGS_UPDATE')
  @ApiOperation({ summary: 'Deactivate service item' })
  deleteItem(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.service.deleteItem(ctx.tenantId, id);
  }
}
