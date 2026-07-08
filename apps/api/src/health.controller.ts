import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from './prisma/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

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
}
