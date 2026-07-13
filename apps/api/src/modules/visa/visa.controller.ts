import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VisaService } from './visa.service';
import { CreateVisaDto, UpdateVisaDto } from './dto/visa.dto';
import { JwtAuthGuard, TenantGuard, PermissionsGuard, RequirePermissions, TenantCtx, TenantContext } from '../../common';

@ApiTags('Tenant - Visas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/clients/:clientId/visas')
export class VisaController {
  constructor(private readonly service: VisaService) {}

  @Post()
  @RequirePermissions('CLIENT_UPDATE')
  @ApiOperation({ summary: 'Add visa record for a client' })
  create(@TenantCtx() ctx: TenantContext, @Param('clientId') clientId: string, @Body() dto: CreateVisaDto) {
    return this.service.create(ctx.tenantId, clientId, ctx.userId, dto);
  }

  @Get()
  @RequirePermissions('CLIENT_READ')
  @ApiOperation({ summary: 'List visas for a client' })
  findAll(@TenantCtx() ctx: TenantContext, @Param('clientId') clientId: string) {
    return this.service.findByClient(ctx.tenantId, clientId);
  }

  @Get(':id')
  @RequirePermissions('CLIENT_READ')
  @ApiOperation({ summary: 'Get visa detail' })
  findOne(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.service.findOne(ctx.tenantId, id);
  }

  @Put(':id')
  @RequirePermissions('CLIENT_UPDATE')
  @ApiOperation({ summary: 'Update visa' })
  update(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: UpdateVisaDto) {
    return this.service.update(ctx.tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('CLIENT_UPDATE')
  @ApiOperation({ summary: 'Deactivate visa' })
  remove(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.service.remove(ctx.tenantId, id);
  }
}
