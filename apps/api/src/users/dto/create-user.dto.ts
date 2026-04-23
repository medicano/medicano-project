import { IsString, IsEmail, IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '../enums/user-role.enum';

export class CreateUserDto {
  @IsString()
  clinicId: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsString()
  password: string;
}
