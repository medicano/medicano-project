import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { SignupDto } from './dtos/signup.dto';
import { LoginStandardDto } from './dtos/login-standard.dto';
import { LoginAttendantDto } from './dtos/login-attendant.dto';
import { IAuthTokens } from './interfaces/auth-tokens.interface';
import { IUser } from '../users/user.schema';
import { UserRole } from './user.roles.enum';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel('User') private readonly userModel: Model<IUser>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async signup(dto: SignupDto): Promise<IAuthTokens> {
    this.validateSignupDto(dto);

    const existingUser = await this.findExistingUser(dto);
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const userData: Partial<IUser> = {
      role: dto.role,
      passwordHash,
    };

    if (dto.role === UserRole.ATTENDANT) {
      userData.username = dto.username;
      userData.clinicId = dto.clinicId;
    } else {
      userData.email = dto.email;
    }

    const user = new this.userModel(userData);
    await user.save();

    return this.issueTokens(user);
  }

  async loginStandard(dto: LoginStandardDto): Promise<IAuthTokens> {
    const user = await this.userModel.findOne({ email: dto.email }).exec();

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.role === UserRole.ATTENDANT) {
      throw new UnauthorizedException('Invalid login method for attendant');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueTokens(user);
  }

  async loginAttendant(dto: LoginAttendantDto): Promise<IAuthTokens> {
    const user = await this.userModel
      .findOne({
        clinicId: dto.clinicId,
        username: dto.username,
      })
      .exec();

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.role !== UserRole.ATTENDANT) {
      throw new UnauthorizedException('Invalid login method');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueTokens(user);
  }

  private validateSignupDto(dto: SignupDto): void {
    if (dto.role === UserRole.ATTENDANT) {
      if (!dto.username || !dto.clinicId) {
        throw new BadRequestException('Username and clinicId are required for attendant');
      }
      if (dto.email) {
        throw new BadRequestException('Email should not be provided for attendant');
      }
    } else {
      if (!dto.email) {
        throw new BadRequestException('Email is required for non-attendant roles');
      }
      if (dto.username || dto.clinicId) {
        throw new BadRequestException('Username and clinicId should not be provided for non-attendant roles');
      }
    }
  }

  private async findExistingUser(dto: SignupDto): Promise<IUser | null> {
    if (dto.role === UserRole.ATTENDANT) {
      return this.userModel
        .findOne({
          clinicId: dto.clinicId,
          username: dto.username,
        })
        .exec();
    } else {
      return this.userModel.findOne({ email: dto.email }).exec();
    }
  }

  private async issueTokens(user: IUser): Promise<IAuthTokens> {
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      username: user.username,
      role: user.role,
      clinicId: user.clinicId,
    };

    const expiresIn = this.configService.get<string>('JWT_EXPIRATION') || '7d';

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '30d',
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpirationToSeconds(expiresIn),
    };
  }

  private parseExpirationToSeconds(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) return 604800;

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    return value * (multipliers[unit] || 1);
  }
}
