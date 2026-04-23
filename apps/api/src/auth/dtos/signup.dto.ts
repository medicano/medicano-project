import { IsEnum, IsEmail, IsNotEmpty, IsOptional, ValidateIf, MinLength } from 'class-validator';
import { UserRole } from '../user.roles.enum';

export class SignupDto {
  @IsEnum(UserRole)
  role: UserRole;

  @ValidateIf(o => o.role !== UserRole.ATTENDANT)
  @IsEmail()
  @IsNotEmpty()
  email?: string;

  @ValidateIf(o => o.role === UserRole.ATTENDANT)
  @IsNotEmpty()
  username?: string;

  @ValidateIf(o => o.role === UserRole.ATTENDANT)
  @IsNotEmpty()
  clinicId?: string;

  @IsNotEmpty()
  @MinLength(8)
  password: string;
}
