import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
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
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const payload = {
      sub: user.id,
      email: user.email,
      isPlatformSuperAdmin: user.isPlatformSuperAdmin,
    };

    const token = this.jwtService.sign(payload);

    const tenants = await this.prisma.userTenantMembership.findMany({
      where: { userId: user.id, isActive: true },
      include: {
        tenant: {
          select: { id: true, name: true, slug: true, logo: true },
        },
      },
    });

    return {
      accessToken: token,
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
}
