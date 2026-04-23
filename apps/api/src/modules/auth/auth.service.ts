import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';
import { UsersService } from '../users/users.service';
import { SignupDto } from './dtos/signup.dto';
import { LoginDto } from './dtos/login.dto';
import { TokenResponseDto, JwtPayload } from './dtos/token.dto';
import { IUser } from '../users/interfaces/user.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject('REDIS_CLIENT') private readonly redisClient: Redis
  ) {}

  async signup(signupDto: SignupDto): Promise<{ tokens: TokenResponseDto; user: Partial<IUser> }> {
    const user = await this.usersService.createUser(
      signupDto.email,
      signupDto.password,
      signupDto.role
    );

    const tokens = await this.generateTokens(user);

    return {
      tokens,
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  async login(loginDto: LoginDto): Promise<{ tokens: TokenResponseDto; user: Partial<IUser> }> {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.usersService.validatePassword(
      loginDto.password,
      user.password
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user);

    return {
      tokens,
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  async refresh(refreshToken: string): Promise<TokenResponseDto> {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get('jwt.secret'),
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const storedUserId = await this.redisClient.get(`refresh:${payload.jti}`);
    if (!storedUserId || storedUserId !== payload.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.redisClient.del(`refresh:${payload.jti}`);

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.generateTokens(user);
  }

  async logout(accessTokenJti: string, refreshToken?: string): Promise<void> {
    const accessTokenPayload = this.jwtService.decode(accessTokenJti) as JwtPayload;
    if (accessTokenPayload && accessTokenPayload.jti && accessTokenPayload.exp) {
      const ttl = accessTokenPayload.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await this.redisClient.set(
          `blacklist:${accessTokenPayload.jti}`,
          '1',
          'EX',
          ttl
        );
      }
    }

    if (refreshToken) {
      try {
        const refreshPayload = this.jwtService.verify<JwtPayload>(refreshToken, {
          secret: this.configService.get('jwt.secret'),
        });
        await this.redisClient.del(`refresh:${refreshPayload.jti}`);
      } catch (error) {
        // Invalid refresh token, ignore
      }
    }
  }

  async validateAccessToken(jti: string): Promise<boolean> {
    const blacklisted = await this.redisClient.get(`blacklist:${jti}`);
    return !blacklisted;
  }

  private async generateTokens(user: IUser): Promise<TokenResponseDto> {
    const accessJti = uuidv4();
    const refreshJti = uuidv4();

    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      jti: accessJti,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('jwt.accessTokenExpiresIn'),
    });

    const refreshPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      jti: refreshJti,
    };

    const refreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: this.configService.get('jwt.refreshTokenExpiresIn'),
    });

    const refreshExpiresIn = this.parseExpirationTime(
      this.configService.get('jwt.refreshTokenExpiresIn')
    );
    await this.redisClient.set(
      `refresh:${refreshJti}`,
      user._id.toString(),
      'EX',
      refreshExpiresIn
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  private parseExpirationTime(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 604800; // Default to 7 days in seconds
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
        return 604800;
    }
  }
}
