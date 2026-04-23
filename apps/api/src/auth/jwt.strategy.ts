import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { RedisService } from './providers/redis.service';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    
    if (!token) {
      throw new UnauthorizedException('Token not found');
    }

    const isValid = await this.redisService.validateToken(payload.sub, token);
    
    if (!isValid) {
      throw new UnauthorizedException('Token has been revoked');
    }

    return {
      userId: payload.sub,
      role: payload.role,
    };
  }
}
