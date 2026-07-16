import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ClientService } from './client.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { QueryClientDto } from './dto/query-client.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantCtx } from '../../common/decorators/tenant-context.decorator';
import { TenantContext } from '../../common/interceptors/tenant-context.interceptor';

@ApiTags('Tenant - Clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/clients')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Post()
  @RequirePermissions('CLIENT_CREATE')
  @ApiOperation({ summary: 'Create a new client' })
  async create(@TenantCtx() ctx: TenantContext, @Body() dto: CreateClientDto) {
    return this.clientService.create(ctx.tenantId, ctx.userId, dto);
  }

  @Get()
  @RequirePermissions('CLIENT_READ')
  @ApiOperation({ summary: 'List clients for current tenant' })
  async findAll(@TenantCtx() ctx: TenantContext, @Query() query: QueryClientDto) {
    return this.clientService.findAll(ctx.tenantId, query, ctx.branchId);
  }

  @Get(':id')
  @RequirePermissions('CLIENT_READ')
  @ApiOperation({ summary: 'Get client by ID' })
  async findById(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.clientService.findById(ctx.tenantId, id);
  }

  @Put(':id')
  @RequirePermissions('CLIENT_UPDATE')
  @ApiOperation({ summary: 'Update client' })
  async update(
    @TenantCtx() ctx: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
  ) {
    return this.clientService.update(ctx.tenantId, ctx.userId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('CLIENT_DELETE')
  @ApiOperation({ summary: 'Soft delete client' })
  async remove(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.clientService.remove(ctx.tenantId, ctx.userId, id);
  }

  @Post('check-duplicates')
  @RequirePermissions('CLIENT_CREATE')
  @ApiOperation({ summary: 'Check for duplicate email/phone across clients and leads' })
  async checkDuplicates(@TenantCtx() ctx: TenantContext, @Body() body: { email?: string; phone?: string; excludeId?: string }) {
    return this.clientService.checkDuplicates(ctx.tenantId, body.email, body.phone, body.excludeId);
  }

  @Get(':id/score')
  @RequirePermissions('CLIENT_READ')
  @ApiOperation({ summary: 'Calculate client activity score' })
  async calculateScore(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.clientService.calculateActivityScore(ctx.tenantId, id);
  }

  @Get(':id/timeline')
  @RequirePermissions('CLIENT_READ')
  @ApiOperation({ summary: 'Get client activity timeline' })
  async getTimeline(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.clientService.getTimeline(ctx.tenantId, id);
  }
}
