import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PassportService } from './passport.service';
import { CreatePassportDto, UpdatePassportDto } from './dto/passport.dto';
import { JwtAuthGuard, TenantGuard, PermissionsGuard, RequirePermissions, TenantCtx, TenantContext } from '../../common';

@ApiTags('Tenant - Passports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/clients/:clientId/passports')
export class PassportController {
  constructor(private readonly service: PassportService) {}

  @Post()
  @RequirePermissions('CLIENT_UPDATE')
  @ApiOperation({ summary: 'Add passport for a client' })
  create(@TenantCtx() ctx: TenantContext, @Param('clientId') clientId: string, @Body() dto: CreatePassportDto) {
    return this.service.create(ctx.tenantId, clientId, ctx.userId, dto);
  }

  @Get()
  @RequirePermissions('CLIENT_READ')
  @ApiOperation({ summary: 'List passports for a client' })
  findAll(@TenantCtx() ctx: TenantContext, @Param('clientId') clientId: string) {
    return this.service.findByClient(ctx.tenantId, clientId);
  }

  @Get(':id')
  @RequirePermissions('CLIENT_READ')
  @ApiOperation({ summary: 'Get passport detail' })
  findOne(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.service.findOne(ctx.tenantId, id);
  }

  @Put(':id')
  @RequirePermissions('CLIENT_UPDATE')
  @ApiOperation({ summary: 'Update passport' })
  update(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: UpdatePassportDto) {
    return this.service.update(ctx.tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('CLIENT_UPDATE')
  @ApiOperation({ summary: 'Deactivate passport' })
  remove(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.service.remove(ctx.tenantId, id);
  }
}
