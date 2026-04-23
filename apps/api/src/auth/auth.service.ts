import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UserService } from '../users/user.service';
import { RedisService } from './redis.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class AuthService {
  private readonly saltRounds = 10;

  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private redisService: RedisService,
    private configService: ConfigService,
  ) {}

  async signup(signupDto: SignupDto): Promise<AuthResponseDto> {
    const { name, email, password, role } = signupDto;

    const passwordHash = await bcrypt.hash(password, this.saltRounds);

    const user = await this.userService.create(name, email, passwordHash, role);

    return this.issueTokens(user);
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.revokeRefreshToken(user._id.toString());

    return this.issueTokens(user);
  }

  async logout(userId: string): Promise<{ success: boolean }> {
    await this.revokeRefreshToken(userId);
    return { success: true };
  }

  async validateUser(payload: JwtPayload): Promise<UserDocument> {
    const user = await this.userService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  private async issueTokens(user: UserDocument): Promise<AuthResponseDto> {
    const payload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const accessTtl = this.configService.get<string>('JWT_ACCESS_TTL', '15m');
    const refreshTtl = this.configService.get<string>('JWT_REFRESH_TTL', '7d');

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: accessTtl as any,
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: refreshTtl as any,
    });

    const refreshTtlSeconds = this.parseTtlToSeconds(refreshTtl);
    await this.storeRefreshToken(user._id.toString(), refreshToken, refreshTtlSeconds);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  private async storeRefreshToken(
    userId: string,
    refreshToken: string,
    ttlSeconds: number,
  ): Promise<void> {
    const key = `refresh:${userId}`;
    await this.redisService.set(key, refreshToken, ttlSeconds);
  }

  private async revokeRefreshToken(userId: string): Promise<void> {
    const key = `refresh:${userId}`;
    await this.redisService.delete(key);
  }

  private parseTtlToSeconds(ttl: string): number {
    const match = ttl.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new BadRequestException('Invalid TTL format');
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        throw new BadRequestException('Invalid TTL unit');
    }
  }
}
