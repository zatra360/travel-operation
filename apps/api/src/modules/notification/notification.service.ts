import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryNotificationDto } from './dto/query-notification.dto';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, userId: string, query: QueryNotificationDto) {
    const page = query.page ?? 1; const limit = query.limit ?? 50; const skip = (page - 1) * limit;
    const where: any = { tenantId, userId };
    if (query.unreadOnly) where.isRead = false;
    const [data, total] = await Promise.all([this.prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }), this.prisma.notification.count({ where })]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async markRead(tenantId: string, userId: string, id: string) {
    const n = await this.prisma.notification.findFirst({ where: { id, tenantId, userId } });
    if (!n) throw new NotFoundException('Notification not found');
    return this.prisma.notification.update({ where: { id }, data: { isRead: true, readAt: new Date() } });
  }

  async markAllRead(tenantId: string, userId: string) {
    await this.prisma.notification.updateMany({ where: { tenantId, userId, isRead: false }, data: { isRead: true, readAt: new Date() } });
    return { marked: true };
  }

  async countUnread(tenantId: string, userId: string) {
    const count = await this.prisma.notification.count({ where: { tenantId, userId, isRead: false } });
    return { unread: count };
  }
}
