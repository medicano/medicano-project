import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RedisService } from '../redis/redis.service';
import { Role } from '../common/enums/role.enum';
import { UserDocument } from './schemas/user.schema';
import { SignupDto } from './dto/signup.dto';
import { LoginStandardDto } from './dto/login-standard.dto';
import { LoginAttendantDto } from './dto/login-attendant.dto';

const TOKEN_TTL = 7 * 24 * 3600;
const STANDARD_ROLES = [Role.PATIENT, Role.CLINIC, Role.PROFESSIONAL];

interface AuthTokens {
  accessToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(dto: SignupDto): Promise<AuthTokens> {
    const user = await this.usersService.createUser(dto);
    const userId = String(user._id);
    const accessToken = this.jwtService.sign({ sub: userId, role: user.role });
    await this.redisService.saveToken(userId, accessToken, TOKEN_TTL);
    return { accessToken };
  }

  async loginStandard(dto: LoginStandardDto): Promise<AuthTokens> {
    let user: UserDocument | null = null;
    for (const role of STANDARD_ROLES) {
      user = await this.usersService.findByEmailAndRole(dto.email, role);
      if (user) break;
    }

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await this.usersService.comparePassword(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid)
      throw new UnauthorizedException('Invalid credentials');

    const userId = String(user._id);
    const accessToken = this.jwtService.sign({ sub: userId, role: user.role });
    await this.redisService.saveToken(userId, accessToken, TOKEN_TTL);
    return { accessToken };
  }

  async loginAttendant(dto: LoginAttendantDto): Promise<AuthTokens> {
    const user = await this.usersService.findByClinicIdAndUsername(
      dto.clinicId,
      dto.username,
    );

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await this.usersService.comparePassword(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid)
      throw new UnauthorizedException('Invalid credentials');

    const userId = String(user._id);
    const accessToken = this.jwtService.sign({ sub: userId, role: user.role });
    await this.redisService.saveToken(userId, accessToken, TOKEN_TTL);
    return { accessToken };
  }

  async logout(userId: string): Promise<void> {
    await this.redisService.removeToken(userId);
  }
}
