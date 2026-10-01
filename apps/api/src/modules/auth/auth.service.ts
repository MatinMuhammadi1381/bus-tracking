import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { normalizeDriverPhone } from '../drivers/phone.util';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService
  ) {}

  async login(identifier: string, password: string) {
    await this.ensureBootstrapAdmin();
    const normalizedIdentifier = identifier
      .trim()
      .replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
      .replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
      .replace(/[\s()-]/g, '');
    const admin = await this.prisma.adminUser.findUnique({
      where: { username: normalizedIdentifier },
    });
    if (admin) {
      if (!admin.isActive || !(await argon2.verify(admin.passwordHash, password))) {
        throw new UnauthorizedException('Invalid credentials');
      }
      const tokens = await this.generateTokens(admin.id, admin.role);
      await this.prisma.adminUser.update({
        where: { id: admin.id },
        data: { refreshToken: tokens.refreshToken },
      });
      return {
        ...tokens,
        user: {
          id: admin.id,
          username: admin.username,
          firstName: admin.firstName,
          lastName: admin.lastName,
          role: admin.role,
        },
      };
    }
    const driverPhone = normalizeDriverPhone(normalizedIdentifier);
    const driver = await this.prisma.driver.findFirst({
      where: {
        OR: [
          { phone: driverPhone },
          { phone: normalizedIdentifier },
          { phone: `+98${driverPhone.slice(1)}` },
        ],
      },
    });
    if (!driver) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await argon2.verify(driver.passwordHash, password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (driver.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    const tokens = await this.generateTokens(driver.id, 'DRIVER');
    await this.updateRefreshToken(driver.id, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      driver: {
        id: driver.id,
        firstName: driver.firstName,
        lastName: driver.lastName,
        phone: driver.phone,
        status: driver.status,
        profilePhotoUrl: driver.profilePhotoUrl,
      },
    };
  }

  async createAdmin(dto: {
    username: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: 'ADMIN' | 'SUPPORT';
  }) {
    const existing = await this.prisma.adminUser.findUnique({ where: { username: dto.username } });
    if (existing) throw new ConflictException('Username already exists');
    const admin = await this.prisma.adminUser.create({
      data: {
        username: dto.username,
        passwordHash: await argon2.hash(dto.password),
        passwordPreview: dto.password,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role || 'ADMIN',
      },
    });
    return {
      id: admin.id,
      username: admin.username,
      firstName: admin.firstName,
      lastName: admin.lastName,
      role: admin.role,
      passwordPreview: admin.passwordPreview,
    };
  }

  async listAdmins() {
    const admins = await this.prisma.adminUser.findMany({
      select: {
        id: true,
        username: true,
        passwordPreview: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return {
      total: admins.length,
      data: admins,
    };
  }

  async resetAdminPassword(id: string, password: string) {
    const admin = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!admin) throw new NotFoundException('Admin not found');
    if (admin.role === 'SUPER_ADMIN') {
      throw new ConflictException('Super admin password cannot be reset here');
    }
    const normalizedPassword = password?.trim();
    if (!normalizedPassword) {
      throw new ConflictException('Password is required');
    }
    const updated = await this.prisma.adminUser.update({
      where: { id },
      data: {
        passwordHash: await argon2.hash(normalizedPassword),
        passwordPreview: normalizedPassword,
      },
    });

    return { id: updated.id, username: updated.username, passwordPreview: normalizedPassword };
  }

  async deleteAdmin(id: string) {
    const admin = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!admin) throw new NotFoundException('Admin not found');
    if (admin.role === 'SUPER_ADMIN') {
      throw new ConflictException('Super admin cannot be deleted');
    }
    await this.prisma.adminUser.delete({ where: { id } });
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });

      const admin = await this.prisma.adminUser.findUnique({ where: { id: payload.sub } });
      const driver = admin
        ? null
        : await this.prisma.driver.findUnique({ where: { id: payload.sub } });
      if (
        (!admin && !driver) ||
        (admin ? admin.refreshToken !== refreshToken : driver!.refreshToken !== refreshToken)
      ) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const tokens = await this.generateTokens(
        payload.sub,
        payload.role || (admin ? admin.role : 'DRIVER')
      );
      if (admin) {
        await this.prisma.adminUser.update({
          where: { id: admin.id },
          data: { refreshToken: tokens.refreshToken },
        });
      } else {
        await this.updateRefreshToken(driver!.id, tokens.refreshToken);
      }

      return tokens;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getProfile(driverId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        status: true,
        createdAt: true,
      },
    });
    if (!driver) {
      throw new NotFoundException('Driver not found');
    }
    return driver;
  }

  async provisionDevice(driverId: string, deviceIdentifier: string) {
    const driver = await this.prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    const device = await this.prisma.driverDevice.upsert({
      where: { driverId_deviceIdentifier: { driverId, deviceIdentifier } },
      update: {
        provisioningStatus: 'PROVISIONED',
        sessionStatus: 'ACTIVE',
        revokedAt: null,
      },
      create: {
        driverId,
        deviceIdentifier,
        provisioningStatus: 'PROVISIONED',
        sessionStatus: 'ACTIVE',
      },
    });

    return device;
  }

  private async generateTokens(subject: string, role: string) {
    const payload = { sub: subject, role };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET') || 'dev-refresh-secret',
      expiresIn: '7d',
    });
    return { accessToken, refreshToken };
  }

  private async ensureBootstrapAdmin() {
    const username = this.configService.get<string>('SUPER_ADMIN_USERNAME');
    const password = this.configService.get<string>('SUPER_ADMIN_PASSWORD');
    if (!username || !password) return;
    const existing = await this.prisma.adminUser.findUnique({ where: { username } });
    if (!existing) {
      await this.prisma.adminUser.create({
        data: {
          username,
          passwordHash: await argon2.hash(password),
          passwordPreview: password,
          firstName: 'Super',
          lastName: 'Admin',
          role: 'SUPER_ADMIN',
        },
      });
    } else if (
      !existing.passwordPreview ||
      !(await argon2.verify(existing.passwordHash, password).catch(() => false))
    ) {
      await this.prisma.adminUser.update({
        where: { id: existing.id },
        data: {
          passwordHash: await argon2.hash(password),
          passwordPreview: password,
        },
      });
    }
  }

  private async updateRefreshToken(driverId: string, refreshToken: string) {
    await this.prisma.driver.update({
      where: { id: driverId },
      data: { refreshToken },
    });
  }
}
