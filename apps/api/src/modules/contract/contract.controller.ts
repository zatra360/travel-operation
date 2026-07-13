import { Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ContractService } from './contract.service';
import { CreateContractDto, UpdateContractDto, SignContractDto } from './dto/contract.dto';
import { JwtAuthGuard, TenantGuard, PermissionsGuard, RequirePermissions, TenantCtx, TenantContext } from '../../common';

@ApiTags('Tenant - Contracts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/clients/:clientId/contracts')
export class ContractController {
  constructor(private readonly service: ContractService) {}

  @Post()
  @RequirePermissions('CLIENT_UPDATE')
  @ApiOperation({ summary: 'Create a contract for a client' })
  create(@TenantCtx() ctx: TenantContext, @Param('clientId') clientId: string, @Body() dto: CreateContractDto) {
    return this.service.create(ctx.tenantId, clientId, ctx.userId, dto);
  }

  @Get()
  @RequirePermissions('CLIENT_READ')
  @ApiOperation({ summary: 'List contracts for a client' })
  findAll(@TenantCtx() ctx: TenantContext, @Param('clientId') clientId: string) {
    return this.service.findByClient(ctx.tenantId, clientId);
  }

  @Get(':id')
  @RequirePermissions('CLIENT_READ')
  @ApiOperation({ summary: 'Get contract detail' })
  findOne(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.service.findOne(ctx.tenantId, id);
  }

  @Put(':id')
  @RequirePermissions('CLIENT_UPDATE')
  @ApiOperation({ summary: 'Update contract' })
  update(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: UpdateContractDto) {
    return this.service.update(ctx.tenantId, id, dto);
  }

  @Post(':id/send')
  @RequirePermissions('CLIENT_UPDATE')
  @ApiOperation({ summary: 'Send contract for signing' })
  send(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.service.send(ctx.tenantId, id);
  }

  @Post(':id/sign')
  @RequirePermissions('CLIENT_UPDATE')
  @ApiOperation({ summary: 'Sign a contract' })
  sign(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: SignContractDto, @Req() req: any) {
    return this.service.sign(ctx.tenantId, id, dto, req.ip);
  }

  @Delete(':id')
  @RequirePermissions('CLIENT_UPDATE')
  @ApiOperation({ summary: 'Soft delete contract' })
  remove(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.service.remove(ctx.tenantId, id);
  }
}

@ApiTags('Public - Contracts')
@Controller('public/contracts')
export class PublicContractController {
  constructor(private readonly service: ContractService) {}

  @Get(':hash')
  @ApiOperation({ summary: 'View contract by public hash' })
  viewByHash(@Param('hash') hash: string) {
    return this.service.findByHash(hash);
  }

  @Post(':hash/sign')
  @ApiOperation({ summary: 'Sign contract via public hash' })
  signByHash(@Param('hash') hash: string, @Body() dto: SignContractDto, @Req() req: any) {
    return this.service.signByHash(hash, dto, req.ip);
  }
}
