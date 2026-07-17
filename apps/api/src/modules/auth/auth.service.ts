import { Injectable, UnauthorizedException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../common/services/email.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { computeLockUntil } from '../../common/utils/lockout';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly email: EmailService,
  ) {}

  async login(dto: LoginDto, ip?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        firstName: true,
        lastName: true,
        isPlatformSuperAdmin: true,
        status: true,
        failedLoginAttempts: true,
        lockedUntil: true,
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      await this.recordLoginAttempt(dto.email, false, ip, userAgent, 'User not found or inactive');
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await this.recordLoginAttempt(user.email, false, ip, userAgent, 'Account locked');
      throw new ForbiddenException(
        'Account is temporarily locked due to too many failed login attempts. Please try again later.',
      );
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      const attempts = (user.failedLoginAttempts ?? 0) + 1;
      const lockedUntil = computeLockUntil(attempts);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: attempts, lockedUntil },
      });
      await this.recordLoginAttempt(user.email, false, ip, userAgent, 'Invalid password');
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.recordLoginAttempt(user.email, true, ip, userAgent);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), failedLoginAttempts: 0, lockedUntil: null },
    });

    const payload = {
      sub: user.id,
      email: user.email,
      isPlatformSuperAdmin: user.isPlatformSuperAdmin,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.generateRefreshToken(user.id, ip);

    const tenants = await this.prisma.userTenantMembership.findMany({
      where: { userId: user.id, isActive: true },
      include: {
        tenant: { select: { id: true, name: true, slug: true, logo: true, settings: true } },
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isPlatformSuperAdmin: user.isPlatformSuperAdmin,
      },
      tenants: tenants.map((t) => ({
        id: t.tenant.id,
        name: t.tenant.name,
        slug: t.tenant.slug,
        logo: t.tenant.logo,
        role: t.role,
      })),
    };
  }
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        isPlatformSuperAdmin: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    return user;
  }

  async getPermissions(userId: string, tenantId: string, branchId?: string) {
    const assignments = await this.prisma.userRoleAssignment.findMany({
      where: {
        userId,
        tenantId,
        ...(branchId ? { branchId } : {}),
      },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    const permissionSet = new Set<string>();
    for (const assignment of assignments) {
      for (const rp of assignment.role.permissions) {
        permissionSet.add(rp.permission.name);
      }
    }

    return [...permissionSet].sort();
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const data: any = {};
    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.phone !== undefined) data.phone = dto.phone;

    if (dto.newPassword) {
      if (!dto.currentPassword) throw new BadRequestException('Current password is required to set a new password');
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
      if (!user) throw new BadRequestException('User not found');
      const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
      if (!valid) throw new BadRequestException('Current password is incorrect');
      data.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, avatar: true, lastLoginAt: true, createdAt: true, updatedAt: true },
    });
  }

  async revokeRefreshToken(token: string) {
    await this.prisma.refreshToken.updateMany({
      where: { token, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Rotates a refresh token: the presented token is revoked and a brand-new
   * refresh token is issued alongside a fresh access token. Reusing a revoked
   * or expired token is rejected.
   */
  async refresh(refreshToken: string, ip?: string) {
    const stored = await this.prisma.refreshToken.findUnique({ where: { token: refreshToken } });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: stored.userId },
      select: { id: true, email: true, isPlatformSuperAdmin: true, status: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User not found or inactive');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      isPlatformSuperAdmin: user.isPlatformSuperAdmin,
    });
    const newRefreshToken = await this.generateRefreshToken(user.id, ip);

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(refreshToken?: string) {
    if (refreshToken) {
      await this.revokeRefreshToken(refreshToken);
    }
    return { success: true };
  }

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingUser) throw new ConflictException('Email already registered');

    const slug = dto.companySlug || dto.companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const existingTenant = await this.prisma.tenant.findUnique({ where: { slug } });
    if (existingTenant) throw new ConflictException('Company slug already taken');

    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const starterPkg = await this.prisma.package.findUnique({ where: { code: 'STARTER' } });

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: dto.companyName, slug, status: 'TRIAL', trialEndsAt },
      });

      if (starterPkg) {
        await tx.tenantSubscription.create({
          data: { tenantId: tenant.id, packageId: starterPkg.id, status: 'ACTIVE', trialEndsAt, billingCycle: 'MONTHLY' },
        });
      }

      const user = await tx.user.create({
        data: {
          email: dto.email, passwordHash: await bcrypt.hash(dto.password, 12),
          firstName: dto.firstName, lastName: dto.lastName, status: 'ACTIVE',
        },
      });

      await tx.userTenantMembership.create({
        data: { userId: user.id, tenantId: tenant.id, role: 'OWNER', isActive: true },
      });

      return { user, tenant };
    });

    const payload = { sub: result.user.id, email: result.user.email, isPlatformSuperAdmin: false };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.generateRefreshToken(result.user.id);

    return {
      accessToken, refreshToken,
      user: { id: result.user.id, email: result.user.email, firstName: result.user.firstName, lastName: result.user.lastName },
      tenant: { id: result.tenant.id, name: result.tenant.name, slug: result.tenant.slug },
    };
  }

  private async generateRefreshToken(userId: string, ip?: string): Promise<string> {
    const token = randomBytes(48).toString('hex');
    await this.prisma.refreshToken.create({
      data: {
        userId,
        token,
        ip,
        device: 'api',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });
    return token;
  }

  private async recordLoginAttempt(
    email: string,
    success: boolean,
    ip?: string,
    userAgent?: string,
    failReason?: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) return;
    await this.prisma.loginHistory.create({
      data: {
        userId: user.id,
        email,
        ip,
        userAgent,
        success,
        failReason,
      },
    });

    if (!success && user) {
      await this.prisma.securityEvent.create({
        data: {
          userId: user.id,
          type: 'FAILED_LOGIN',
          details: `Failed login attempt from IP: ${ip || 'unknown'}`,
          ip,
        },
      });
    }
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, firstName: true, status: true },
    });

    if (user && user.status === 'ACTIVE') {
      const payload = { sub: user.id, email: user.email, purpose: 'password-reset' };
      const token = this.jwtService.sign(payload, { expiresIn: '15m' });
      const resetUrl = `${process.env.WEB_ORIGIN || 'http://localhost:3901'}/reset-password?token=${token}`;

      this.email.send({
        to: user.email,
        subject: 'Reset your ZATRA360 password',
        html: `<div style="font-family:sans-serif;padding:20px">
          <h2 style="color:#6366f1">Password Reset Request</h2>
          <p>Hi ${user.firstName},</p>
          <p>You requested a password reset. Click the button below to set a new password. This link expires in 15 minutes.</p>
          <p><a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#6366f1;color:#fff;text-decoration:none;border-radius:6px;font-weight:500">Reset Password</a></p>
          <p style="margin-top:20px">If you did not request this, please ignore this email.</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>
          <p style="color:#9ca3af;font-size:12px">Sent by ZATRA360 — Travel Operation Platform</p>
        </div>`,
      }).catch(() => {});
    }

    return { success: true, message: 'If the email exists, a reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(token, { ignoreExpiration: false });
    } catch {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (payload.purpose !== 'password-reset') {
      throw new BadRequestException('Invalid token purpose');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, status: true } });
    if (!user || user.status !== 'ACTIVE') {
      throw new BadRequestException('User not found or inactive');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    await this.prisma.securityEvent.create({
      data: { userId: user.id, type: 'PASSWORD_RESET', details: 'Password reset via email token' },
    });

    return { success: true, message: 'Password has been reset successfully. You can now log in.' };
  }

  async getPreferences(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { metadata: true },
    });
    const meta = (user?.metadata as any) || {};
    return {
      emailNotifications: meta.emailNotifications !== false,
      smsNotifications: meta.smsNotifications !== undefined ? meta.smsNotifications : false,
      bookingUpdates: meta.bookingUpdates !== false,
      quotationUpdates: meta.quotationUpdates !== false,
    };
  }

  async updatePreferences(userId: string, prefs: Record<string, boolean>) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { metadata: true } });
    const meta = (user?.metadata as any) || {};
    const updated = { ...meta, ...prefs };
    await this.prisma.user.update({ where: { id: userId }, data: { metadata: updated } });
    return updated;
  }
}
