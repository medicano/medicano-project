import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private redisService: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') || 'medicano-secret-key',
    });
  }

  async validate(payload: JwtPayload): Promise<{ userId: string; username: string }> {
    const userId = payload.sub;

    const storedToken = await this.redisService.getToken(userId);

    if (!storedToken) {
      throw new UnauthorizedException('Token has been revoked or expired');
    }

    return {
      userId: payload.sub,
      username: payload.username,
    };
  }
}
