import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';

@ApiTags('Platform - Audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@Controller('platform/audit-logs')
export class PlatformAuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List all audit logs across all tenants' })
  async list(@Query('page') page = 1, @Query('limit') limit = 50, @Query('module') module?: string, @Query('actorId') actorId?: string) {
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};
    if (module) where.module = module;
    if (actorId) where.actorId = actorId;
    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: Number(limit) }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { data, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) };
  }
}
