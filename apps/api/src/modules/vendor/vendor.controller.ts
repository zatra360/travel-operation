import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VendorService } from './vendor.service';
import { CreateVendorDto, UpdateVendorDto, QueryVendorDto } from './dto/vendor.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantCtx } from '../../common/decorators/tenant-context.decorator';
import { TenantContext } from '../../common/interceptors/tenant-context.interceptor';

@ApiTags('Tenant - Vendors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/vendors')
export class VendorController {
  constructor(private readonly service: VendorService) {}

  @Post()
  @RequirePermissions('VENDOR_CREATE')
  @ApiOperation({ summary: 'Create a vendor/supplier' })
  create(@TenantCtx() ctx: TenantContext, @Body() dto: CreateVendorDto) {
    return this.service.create(ctx.tenantId, ctx.userId, dto);
  }

  @Get()
  @RequirePermissions('VENDOR_READ')
  @ApiOperation({ summary: 'List vendors' })
  findAll(@TenantCtx() ctx: TenantContext, @Query() query: QueryVendorDto) {
    return this.service.findAll(ctx.tenantId, query);
  }

  @Get(':id')
  @RequirePermissions('VENDOR_READ')
  @ApiOperation({ summary: 'Get vendor by ID' })
  findOne(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.service.findById(ctx.tenantId, id);
  }

  @Put(':id')
  @RequirePermissions('VENDOR_UPDATE')
  @ApiOperation({ summary: 'Update vendor' })
  update(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: UpdateVendorDto) {
    return this.service.update(ctx.tenantId, ctx.userId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('VENDOR_DELETE')
  @ApiOperation({ summary: 'Delete vendor (soft delete)' })
  remove(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.service.remove(ctx.tenantId, ctx.userId, id);
  }
}
