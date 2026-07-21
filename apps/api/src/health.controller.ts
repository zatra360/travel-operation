import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from './prisma/prisma.service';
import { AlertService } from './common/services/alert.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alert: AlertService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Basic health check' })
  check() { return { status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() }; }

  @Get('db')
  @ApiOperation({ summary: 'Database health check' })
  async db() {
    try { await this.prisma.$queryRaw`SELECT 1`; return { status: 'ok', database: 'connected' }; }
    catch (e: any) { return { status: 'error', database: 'disconnected', message: e.message }; }
  }

  @Get('storage')
  @ApiOperation({ summary: 'Storage health check' })
  storage() { return { status: 'ok', storage: process.env.R2_ENDPOINT ? 'configured' : 'not configured' }; }

  @Get('expire-trials')
  @ApiOperation({ summary: 'Auto-expire trials past their end date' })
  async expireTrials() {
    const expired = await this.prisma.tenant.updateMany({
      where: { status: 'TRIAL', trialEndsAt: { lte: new Date() } },
      data: { status: 'EXPIRED' },
    });
    return { status: 'ok', expired: expired.count };
  }

  @Post('check-expiries')
  @ApiOperation({ summary: 'Check expiring bookings, quotations, passports, visas. ?send=true to email.' })
  async checkExpiries(@Query('send') send?: string) {
    return this.alert.checkExpiries(send === 'true');
  }
}
