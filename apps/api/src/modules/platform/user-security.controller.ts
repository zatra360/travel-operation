import { Controller, Post, Param, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@ApiTags('Platform - User Security')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PlatformAdminGuard, PermissionsGuard)
@Controller('platform/user-security')
export class PlatformUserSecurityController {
  constructor(private readonly prisma: PrismaService) {}

  @Post(':userId/unlock')
  @RequirePermissions('USER_MANAGE')
  @ApiOperation({ summary: 'Unlock a user account (clear lockout)' })
  async unlock(@Param('userId') userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });

    await this.prisma.securityEvent.create({
      data: {
        userId,
        type: 'ACCOUNT_UNLOCKED',
        details: 'Account manually unlocked by platform admin',
      },
    });

    return { unlocked: true };
  }
}
