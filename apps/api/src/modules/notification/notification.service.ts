import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { EmailService } from '../../common/services/email.service';

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

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

  async notify(params: {
    tenantId: string;
    userId: string;
    title: string;
    body?: string;
    channel?: 'IN_APP' | 'EMAIL';
    userEmail?: string;
  }) {
    const { tenantId, userId, title, body, channel = 'IN_APP', userEmail } = params;

    const notification = await this.prisma.notification.create({
      data: {
        tenantId,
        userId,
        title,
        body: body ?? null,
        channel,
        type: 'INFO',
      },
    });

    if (channel === 'EMAIL' && userEmail) {
      this.email.send({
        to: userEmail,
        subject: title,
        html: `<div style="font-family:sans-serif;padding:20px"><h2>${title}</h2>${body ? `<p>${body}</p>` : ''}<hr/><p style="color:#666;font-size:12px">Sent by Travel Operation</p></div>`,
      }).catch(() => {});
    }

    return notification;
  }
}
