import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthService } from './auth.service';
import { LoginAttendantDto } from './dto/login-attendant.dto';
import { LoginStandardDto } from './dto/login-standard.dto';
import { SignupDto } from './dto/signup.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

interface AuthTokens {
  accessToken: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signup(@Body() signupDto: SignupDto): Promise<AuthTokens> {
    return this.authService.signup(signupDto);
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() loginDto: LoginStandardDto): Promise<AuthTokens> {
    return this.authService.loginStandard(loginDto);
  }

  @Post('login/attendant')
  @HttpCode(200)
  async loginAttendant(
    @Body() loginDto: LoginAttendantDto,
  ): Promise<AuthTokens> {
    return this.authService.loginAttendant(loginDto);
  }

  @Post('logout')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  async logout(@CurrentUser() userId: string): Promise<void> {
    return this.authService.logout(userId);
  }
}
