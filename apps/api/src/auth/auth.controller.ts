import { Controller, Post, Body, ValidationPipe } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dtos/signup.dto';
import { LoginStandardDto } from './dtos/login-standard.dto';
import { LoginAttendantDto } from './dtos/login-attendant.dto';
import { IAuthTokens } from './interfaces/auth-tokens.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signup(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    dto: SignupDto,
  ): Promise<IAuthTokens> {
    return this.authService.signup(dto);
  }

  @Post('login')
  async login(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    body: any,
  ): Promise<IAuthTokens> {
    if (body.clinicId && body.username) {
      const dto = body as LoginAttendantDto;
      return this.authService.loginAttendant(dto);
    } else if (body.email) {
      const dto = body as LoginStandardDto;
      return this.authService.loginStandard(dto);
    } else {
      throw new Error('Invalid login payload');
    }
  }
}
