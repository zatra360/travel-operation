import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FollowUpService } from './follow-up.service';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';
import { UpdateFollowUpDto } from './dto/update-follow-up.dto';
import { QueryFollowUpDto } from './dto/query-follow-up.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantCtx } from '../../common/decorators/tenant-context.decorator';
import { TenantContext } from '../../common/interceptors/tenant-context.interceptor';

@ApiTags('Tenant - Follow-ups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/follow-ups')
export class FollowUpController {
  constructor(private readonly followUpService: FollowUpService) {}

  @Post()
  @RequirePermissions('FOLLOW_UP_CREATE')
  @ApiOperation({ summary: 'Create a new follow-up' })
  async create(@TenantCtx() ctx: TenantContext, @Body() dto: CreateFollowUpDto) {
    return this.followUpService.create(ctx.tenantId, ctx.userId, dto);
  }

  @Get()
  @RequirePermissions('FOLLOW_UP_READ')
  @ApiOperation({ summary: 'List follow-ups for current tenant' })
  async findAll(@TenantCtx() ctx: TenantContext, @Query() query: QueryFollowUpDto) {
    return this.followUpService.findAll(ctx.tenantId, query);
  }

  @Get(':id')
  @RequirePermissions('FOLLOW_UP_READ')
  @ApiOperation({ summary: 'Get follow-up by ID' })
  async findById(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.followUpService.findById(ctx.tenantId, id);
  }

  @Put(':id')
  @RequirePermissions('FOLLOW_UP_UPDATE')
  @ApiOperation({ summary: 'Update follow-up' })
  async update(
    @TenantCtx() ctx: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateFollowUpDto,
  ) {
    return this.followUpService.update(ctx.tenantId, ctx.userId, id, dto);
  }

  @Post(':id/complete')
  @RequirePermissions('FOLLOW_UP_UPDATE')
  @ApiOperation({ summary: 'Mark follow-up as completed' })
  async complete(
    @TenantCtx() ctx: TenantContext,
    @Param('id') id: string,
    @Body() body: { outcome?: string },
  ) {
    return this.followUpService.complete(ctx.tenantId, ctx.userId, id, body?.outcome);
  }

  @Delete(':id')
  @RequirePermissions('FOLLOW_UP_DELETE')
  @ApiOperation({ summary: 'Delete follow-up' })
  async remove(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.followUpService.remove(ctx.tenantId, ctx.userId, id);
  }
}
