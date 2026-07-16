import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from './email.service';

export interface ExpiryAlert {
  type: string;
  entity: string;
  entityId: string;
  subject: string;
  message: string;
  expiresAt: Date;
  userEmail?: string;
}

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async checkExpiries(sendEmails = false): Promise<{ alerts: ExpiryAlert[]; emailsSent: number }> {
    const now = new Date();
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const alerts: ExpiryAlert[] = [];

    const bookings = await this.prisma.booking.findMany({
      where: {
        deletedAt: null,
        status: 'HELD',
        holdExpiresAt: { lte: in3Days },
      },
      include: { tenant: { select: { name: true } }, client: { select: { displayName: true, email: true } } },
      take: 100,
    });

    for (const b of bookings) {
      alerts.push({
        type: 'BOOKING_HOLD_EXPIRY',
        entity: 'Booking',
        entityId: b.id,
        subject: `Booking ${b.bookingRef} hold expiring soon`,
        message: `Booking ${b.bookingRef} for ${b.client?.displayName || 'unknown client'} at ${b.tenant.name} will expire on ${b.holdExpiresAt?.toISOString().slice(0, 10)}.`,
        expiresAt: b.holdExpiresAt!,
        userEmail: b.client?.email || undefined,
      });
    }

    const quotations = await this.prisma.quotation.findMany({
      where: {
        deletedAt: null,
        status: 'SENT',
        validUntil: { lte: in3Days, gte: now },
      },
      include: { tenant: { select: { name: true } }, client: { select: { displayName: true, email: true } } },
      take: 100,
    });

    for (const q of quotations) {
      alerts.push({
        type: 'QUOTATION_EXPIRY',
        entity: 'Quotation',
        entityId: q.id,
        subject: `Quotation ${q.quoteNumber} expiring soon`,
        message: `Quotation ${q.quoteNumber} for ${q.client?.displayName || 'unknown client'} at ${q.tenant.name} expires on ${q.validUntil?.toISOString().slice(0, 10)}.`,
        expiresAt: q.validUntil!,
        userEmail: q.client?.email || undefined,
      });
    }

    const passports = await this.prisma.clientPassport.findMany({
      where: {
        isActive: true,
        expiryDate: { lte: in7Days, gte: now },
      },
      include: {
        client: {
          select: { displayName: true, email: true, tenant: { select: { name: true } } },
        },
      },
      take: 100,
    });

    for (const p of passports) {
      alerts.push({
        type: 'PASSPORT_EXPIRY',
        entity: 'Passport',
        entityId: p.id,
        subject: `Passport ${p.passportNumber} expiring soon`,
        message: `Passport ${p.passportNumber} for ${p.client.displayName} at ${p.client.tenant.name} expires on ${p.expiryDate.toISOString().slice(0, 10)}.`,
        expiresAt: p.expiryDate,
        userEmail: p.client.email || undefined,
      });
    }

    const visas = await this.prisma.clientVisa.findMany({
      where: {
        isActive: true,
        expiryDate: { lte: in7Days, gte: now },
      },
      include: {
        client: {
          select: { displayName: true, email: true, tenant: { select: { name: true } } },
        },
      },
      take: 100,
    });

    for (const v of visas) {
      alerts.push({
        type: 'VISA_EXPIRY',
        entity: 'Visa',
        entityId: v.id,
        subject: `Visa for ${v.client.displayName} expiring soon`,
        message: `Visa ${v.visaType || 'document'} for ${v.client.displayName} at ${v.client.tenant.name} expires on ${v.expiryDate?.toISOString().slice(0, 10)}.`,
        expiresAt: v.expiryDate!,
        userEmail: v.client.email || undefined,
      });
    }

    let emailsSent = 0;
    if (sendEmails) {
      for (const alert of alerts) {
        if (alert.userEmail) {
          const sent = await this.email.send({
            to: alert.userEmail,
            subject: alert.subject,
            html: `<div style="font-family:sans-serif;padding:20px;max-width:500px"><h2>${alert.subject}</h2><p>${alert.message}</p><p style="color:#666;font-size:12px">This is an automated reminder from Travel Operation.</p></div>`,
          });
          if (sent) emailsSent++;
        }
      }
    }

    this.logger.log(`Expiry check: ${alerts.length} alerts found, ${emailsSent} emails sent`);
    return { alerts, emailsSent };
  }
}
