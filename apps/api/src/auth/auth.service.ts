import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '../users/schemas/user.schema';
import { RedisService } from '../redis/redis.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

const TOKEN_TTL = 7 * 24 * 3600; // 7 days in seconds

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    private redisService: RedisService,
  ) {}

  async signup(signupDto: SignupDto): Promise<AuthResponseDto> {
    const { username, email, password, role } = signupDto;

    const existingUser = await this.userModel.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      throw new ConflictException('Username or email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new this.userModel({
      username,
      email,
      password: hashedPassword,
      role,
      isActive: true,
    });

    await user.save();

    const payload = {
      sub: user._id.toString(),
      username: user.username,
    };

    const token = this.jwtService.sign(payload);

    try {
      await this.redisService.saveToken(user._id.toString(), token, TOKEN_TTL);
    } catch (error) {
      throw new InternalServerErrorException('Failed to save authentication token');
    }

    return {
      accessToken: token,
      expiresIn: TOKEN_TTL,
    };
  }

  async loginStandard(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { username, password } = loginDto;

    const user = await this.userModel.findOne({ username });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.role !== 'patient' && user.role !== 'doctor') {
      throw new UnauthorizedException('Invalid login method for this user role');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    const payload = {
      sub: user._id.toString(),
      username: user.username,
    };

    const token = this.jwtService.sign(payload);

    try {
      await this.redisService.saveToken(user._id.toString(), token, TOKEN_TTL);
    } catch (error) {
      throw new InternalServerErrorException('Failed to save authentication token');
    }

    return {
      accessToken: token,
      expiresIn: TOKEN_TTL,
    };
  }

  async loginAttendant(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { username, password } = loginDto;

    const user = await this.userModel.findOne({ username });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.role !== 'attendant') {
      throw new UnauthorizedException('Invalid login method for this user role');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    const payload = {
      sub: user._id.toString(),
      username: user.username,
    };

    const token = this.jwtService.sign(payload);

    try {
      await this.redisService.saveToken(user._id.toString(), token, TOKEN_TTL);
    } catch (error) {
      throw new InternalServerErrorException('Failed to save authentication token');
    }

    return {
      accessToken: token,
      expiresIn: TOKEN_TTL,
    };
  }

  async logout(userId: string): Promise<void> {
    try {
      await this.redisService.removeToken(userId);
    } catch (error) {
      throw new InternalServerErrorException('Failed to revoke authentication token');
    }
  }

  async validateUser(userId: string): Promise<UserDocument> {
    const user = await this.userModel.findById(userId);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return user;
  }
}
