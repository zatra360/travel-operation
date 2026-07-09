import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReissueService } from './reissue.service';
import { CreateReissueDto } from './dto/create-reissue.dto';
import { UpdateReissueDto } from './dto/update-reissue.dto';
import { QueryReissueDto } from './dto/query-reissue.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantCtx } from '../../common/decorators/tenant-context.decorator';
import { TenantContext } from '../../common/interceptors/tenant-context.interceptor';

@ApiTags('Tenant - Reissues') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/reissues')
export class ReissueController {
  constructor(private readonly reissueService: ReissueService) {}

  @Post() @RequirePermissions('REISSUE_CREATE') @ApiOperation({ summary: 'Create a reissue request' })
  async create(@TenantCtx() ctx: TenantContext, @Body() dto: CreateReissueDto) { return this.reissueService.create(ctx.tenantId, ctx.userId, dto); }

  @Get() @RequirePermissions('REISSUE_READ') @ApiOperation({ summary: 'List reissue requests' })
  async findAll(@TenantCtx() ctx: TenantContext, @Query() query: QueryReissueDto) { return this.reissueService.findAll(ctx.tenantId, query); }

  @Get(':id') @RequirePermissions('REISSUE_READ') @ApiOperation({ summary: 'Get reissue request' })
  async findById(@TenantCtx() ctx: TenantContext, @Param('id') id: string) { return this.reissueService.findById(ctx.tenantId, id); }

  @Put(':id') @RequirePermissions('REISSUE_UPDATE') @ApiOperation({ summary: 'Update reissue request' })
  async update(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: UpdateReissueDto) { return this.reissueService.update(ctx.tenantId, ctx.userId, id, dto); }

  @Post(':id/approve') @RequirePermissions('REISSUE_UPDATE') @ApiOperation({ summary: 'Approve reissue request' })
  async approve(@TenantCtx() ctx: TenantContext, @Param('id') id: string) { return this.reissueService.approve(ctx.tenantId, ctx.userId, id); }

  @Post(':id/reject') @RequirePermissions('REISSUE_UPDATE') @ApiOperation({ summary: 'Reject reissue request' })
  async reject(@TenantCtx() ctx: TenantContext, @Param('id') id: string) { return this.reissueService.reject(ctx.tenantId, ctx.userId, id); }

  @Post(':id/process') @RequirePermissions('REISSUE_UPDATE') @ApiOperation({ summary: 'Process reissue request' })
  async process(@TenantCtx() ctx: TenantContext, @Param('id') id: string) { return this.reissueService.process(ctx.tenantId, ctx.userId, id); }

  @Get(':id/timeline') @RequirePermissions('REISSUE_READ') @ApiOperation({ summary: 'Get reissue timeline' })
  async getTimeline(@TenantCtx() ctx: TenantContext, @Param('id') id: string) { return this.reissueService.getTimeline(ctx.tenantId, id); }

  @Delete(':id') @RequirePermissions('REISSUE_DELETE') @ApiOperation({ summary: 'Delete reissue request' })
  async remove(@TenantCtx() ctx: TenantContext, @Param('id') id: string) { return this.reissueService.remove(ctx.tenantId, ctx.userId, id); }
}
