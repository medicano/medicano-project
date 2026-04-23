import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  Get,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthTokenDto } from './dto/auth-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto): Promise<AuthTokenDto> {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @CurrentUser() user: any): Promise<{ success: boolean }> {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (token) {
      await this.authService.logout(user.userId, token);
    }
    
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@CurrentUser() user: any) {
    return user;
  }
}
