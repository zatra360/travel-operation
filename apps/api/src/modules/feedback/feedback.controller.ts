import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto, QueryFeedbackDto } from './dto/feedback.dto';
import { JwtAuthGuard, TenantGuard, PermissionsGuard, RequirePermissions, TenantCtx, TenantContext } from '../../common';

@ApiTags('Tenant - Feedback')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/feedback')
export class FeedbackController {
  constructor(private readonly service: FeedbackService) {}

  @Post() @RequirePermissions('FEEDBACK_CREATE') @ApiOperation({ summary: 'Submit feedback' })
  create(@TenantCtx() ctx: TenantContext, @Body() dto: CreateFeedbackDto) { return this.service.create(ctx.tenantId, ctx.userId, dto); }

  @Get() @RequirePermissions('FEEDBACK_READ') @ApiOperation({ summary: 'List feedback' })
  findAll(@TenantCtx() ctx: TenantContext, @Query() query: QueryFeedbackDto) { return this.service.findAll(ctx.tenantId, query); }

  @Get('stats') @RequirePermissions('FEEDBACK_READ') @ApiOperation({ summary: 'Feedback stats (avg rating, NPS, distribution)' })
  stats(@TenantCtx() ctx: TenantContext) { return this.service.getStats(ctx.tenantId); }

  @Delete(':id') @RequirePermissions('FEEDBACK_DELETE') @ApiOperation({ summary: 'Delete feedback' })
  remove(@TenantCtx() ctx: TenantContext, @Param('id') id: string) { return this.service.remove(ctx.tenantId, ctx.userId, id); }
}
