import { Injectable } from '@nestjs/common';
import { randomBytes, createHmac } from 'crypto';

@Injectable()
export class TotpService {
  generateSecret(): string {
    return randomBytes(20).toString('base64').replace(/[=+/]/g, '').substring(0, 32);
  }

  getOtpAuthUrl(secret: string, email: string, issuer = 'ZATRA360'): string {
    const encodedIssuer = encodeURIComponent(issuer);
    const encodedEmail = encodeURIComponent(email);
    return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
  }

  verify(secret: string, token: string): boolean {
    if (!secret || !token || token.length !== 6) return false;

    // Allow ±1 windows (current, previous, next 30-second window)
    const now = Math.floor(Date.now() / 1000);
    const window = 30;
    const counter = Math.floor(now / window);

    for (let offset = -1; offset <= 1; offset++) {
      if (this.generateToken(secret, counter + offset) === token) {
        return true;
      }
    }
    return false;
  }

  private generateToken(secret: string, counter: number): string {
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigInt64BE(BigInt(counter));
    const key = Buffer.from(secret, 'ascii');
    const hmac = createHmac('sha1', key).update(counterBuffer).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);
    const otp = binary % 1_000_000;
    return otp.toString().padStart(6, '0');
  }
}
