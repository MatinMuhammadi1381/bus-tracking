import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: string; role?: string }) {
    const admin = await this.prisma.adminUser.findUnique({ where: { id: payload.sub } });
    if (admin) {
      if (!admin.isActive) throw new UnauthorizedException('Admin account is inactive');
      return { sub: admin.id, role: admin.role };
    }
    const driver = await this.prisma.driver.findUnique({
      where: { id: payload.sub },
      select: { id: true, firstName: true, lastName: true, phone: true, status: true },
    });

    if (!driver || driver.status !== 'ACTIVE') {
      throw new UnauthorizedException('Driver not found or inactive');
    }

    return { sub: driver.id, role: 'DRIVER' as const };
  }
}
