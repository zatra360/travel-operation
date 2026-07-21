import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@ApiTags('Platform - Login History')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PlatformAdminGuard, PermissionsGuard)
@Controller('platform/login-history')
export class PlatformLoginHistoryController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions('USER_READ')
  @ApiOperation({ summary: 'List login history across all users' })
  async list(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('search') search?: string,
  ) {
    const skip = (+page - 1) * +limit;
    const where: Record<string, unknown> = {};
    if (search) {
      where.email = { contains: search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.loginHistory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: +limit,
        select: {
          id: true, email: true, ip: true, userAgent: true,
          success: true, failReason: true, createdAt: true,
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.loginHistory.count({ where }),
    ]);

    return { data, total, page: +page, limit: +limit, totalPages: Math.ceil(total / +limit) };
  }
}
