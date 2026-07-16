import { Controller, Post, Get, Put, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantCtx } from '../../common/decorators/tenant-context.decorator';
import { TenantContext } from '../../common/interceptors/tenant-context.interceptor';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  @ApiOperation({ summary: 'User login' })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] as string;
    return this.authService.login(dto, ip, userAgent);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 3600000 } })
  @Post('register')
  @ApiOperation({ summary: 'Register a new company and admin account' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Rotate access & refresh tokens' })
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress;
    return this.authService.refresh(dto.refreshToken, ip);
  }

  @Public()
  @Post('logout')
  @ApiOperation({ summary: 'Revoke a refresh token (logout)' })
  async logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Get('permissions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get effective permissions for the current tenant/branch' })
  async permissions(@CurrentUser() user: AuthUser, @TenantCtx() ctx: TenantContext) {
    if (user.isPlatformSuperAdmin) {
      return { permissions: ['*'], isPlatformSuperAdmin: true };
    }
    const perms = await this.authService.getPermissions(user.id, ctx.tenantId, ctx.branchId);
    return { permissions: perms, isPlatformSuperAdmin: false };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser() user: AuthUser) {
    return this.authService.getProfile(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('preferences')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get notification preferences' })
  async getPreferences(@CurrentUser() user: AuthUser) {
    return this.authService.getPreferences(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put('preferences')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update notification preferences' })
  async updatePreferences(@CurrentUser() user: AuthUser, @Body() prefs: Record<string, boolean>) {
    return this.authService.updatePreferences(user.id, prefs);
  }
}
