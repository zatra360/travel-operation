import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../../modules/notification/notification.service';
import { ActivityService } from '../../modules/activity/activity.service';

@Injectable()
export class BookingExpiryService {
  private readonly logger = new Logger(BookingExpiryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notification: NotificationService,
    private readonly activity: ActivityService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async expireHeldBookings() {
    try {
      const now = new Date();
      const expired = await this.prisma.booking.findMany({
        where: {
          status: 'HELD',
          holdExpiresAt: { lte: now },
          deletedAt: null,
        },
        select: { id: true, tenantId: true, bookingRef: true, assignedToId: true },
      });

      for (const booking of expired) {
        await this.prisma.booking.update({
          where: { id: booking.id },
          data: { status: 'CANCELLED' },
        });

        await this.prisma.bookingStatusLog.create({
          data: {
            tenantId: booking.tenantId,
            bookingId: booking.id,
            fromStatus: 'HELD',
            toStatus: 'CANCELLED',
            note: 'Auto-cancelled: hold period expired',
          },
        });

        await this.activity.log(
          booking.tenantId,
          'system',
          'BOOKING_AUTO_CANCELLED',
          `Booking ${booking.bookingRef} auto-cancelled (hold expired)`,
          'Booking',
          booking.id,
        );

        if (booking.assignedToId) {
          this.notification.notify({
            tenantId: booking.tenantId,
            userId: booking.assignedToId,
            title: `Booking ${booking.bookingRef} expired`,
            body: `Booking ${booking.bookingRef} has been auto-cancelled because the hold period expired.`,
          }).catch(() => {});
        }

        this.logger.log(`Expired booking ${booking.bookingRef} auto-cancelled`);
      }

      if (expired.length > 0) {
        this.logger.log(`Auto-cancelled ${expired.length} expired bookings`);
      }
    } catch (err: any) {
      this.logger.error(`Booking expiry scan failed: ${err.message}`);
    }
  }
}
