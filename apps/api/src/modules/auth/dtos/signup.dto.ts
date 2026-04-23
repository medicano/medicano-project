import { IsEmail, IsString, MinLength, IsEnum } from 'class-validator';
import { UserRole } from '../constants';

export class SignupDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsEnum(UserRole)
  role: UserRole;
}
