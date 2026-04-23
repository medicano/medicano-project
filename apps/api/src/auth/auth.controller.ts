import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { LogoutResponseDto } from './dto/logout-response.dto';
import { JwtRedisAuthGuard } from './guards/jwt-redis-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body('email') email: string,
    @Body('password') password: string,
    @Body('name') name: string,
  ) {
    const user = await this.authService.register(email, password, name);
    return {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(loginDto);
  }

  @Post('logout')
  @UseGuards(JwtRedisAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Request() req: any): Promise<LogoutResponseDto> {
    const userId = req.user.userId;
    return this.authService.logout(userId);
  }
}
