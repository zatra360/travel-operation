import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantCtx } from '../../common/decorators/tenant-context.decorator';
import { TenantContext } from '../../common/interceptors/tenant-context.interceptor';

@ApiTags('Tenant - Notifications') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/notifications')
export class NotificationController {
  constructor(private readonly service: NotificationService) {}
  @Get() @RequirePermissions('NOTIFICATION_READ') @ApiOperation({ summary: 'List notifications' }) async findAll(@TenantCtx() ctx: TenantContext, @Query() q: QueryNotificationDto) { return this.service.findAll(ctx.tenantId, ctx.userId, q); }
  @Post(':id/read') @RequirePermissions('NOTIFICATION_READ') @ApiOperation({ summary: 'Mark as read' }) async markRead(@TenantCtx() ctx: TenantContext, @Param('id') id: string) { return this.service.markRead(ctx.tenantId, ctx.userId, id); }
  @Post('read-all') @RequirePermissions('NOTIFICATION_READ') @ApiOperation({ summary: 'Mark all as read' }) async markAllRead(@TenantCtx() ctx: TenantContext) { return this.service.markAllRead(ctx.tenantId, ctx.userId); }
  @Get('count') @RequirePermissions('NOTIFICATION_READ') @ApiOperation({ summary: 'Unread count' }) async countUnread(@TenantCtx() ctx: TenantContext) { return this.service.countUnread(ctx.tenantId, ctx.userId); }
}
