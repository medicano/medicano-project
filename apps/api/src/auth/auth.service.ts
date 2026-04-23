import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto';
import { AuthTokenDto } from './dto/auth-token.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { RedisService } from './providers/redis.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.validateUserCredentials(email, password);
    
    if (!user) {
      return null;
    }

    return user;
  }

  async login(loginDto: LoginDto): Promise<AuthTokenDto> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    await this.redisService.storeToken(user.id, accessToken);

    return {
      accessToken,
    };
  }

  async logout(userId: string, token: string): Promise<void> {
    await this.redisService.removeToken(userId, token);
  }
}
