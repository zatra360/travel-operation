import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey: string;
  private readonly fromAddress: string;
  private readonly apiUrl = 'https://api.resend.com/emails';

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('RESEND_API_KEY') || '';
    this.fromAddress = this.config.get<string>('EMAIL_FROM') || 'noreply@travel-operation.com';
  }

  async send(payload: EmailPayload): Promise<boolean> {
    if (!this.apiKey) {
      this.logger.warn('RESEND_API_KEY not set — email not sent');
      return false;
    }

    try {
      const res = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.fromAddress,
          to: [payload.to],
          subject: payload.subject,
          html: payload.html,
          ...(payload.text ? { text: payload.text } : {}),
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        this.logger.error(`Email send failed: ${res.status} ${body}`);
        return false;
      }

      this.logger.log(`Email sent to ${payload.to}: ${payload.subject}`);
      return true;
    } catch (err: any) {
      this.logger.error(`Email send error: ${err.message}`);
      return false;
    }
  }
}
