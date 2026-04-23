import { IsEnum, IsOptional, IsString, IsMongoId, MinLength, ValidateIf, IsEmail } from 'class-validator';
import { Role } from '../enums/role.enum';

export class CreateUserDto {
  @IsEnum(Role)
  readonly role: Role;

  @ValidateIf(o => o.role !== Role.ATTENDANT)
  @IsString()
  @IsEmail()
  @IsOptional()
  readonly email?: string;

  @ValidateIf(o => o.role === Role.ATTENDANT)
  @IsMongoId()
  @IsOptional()
  readonly clinicId?: string;

  @ValidateIf(o => o.role === Role.ATTENDANT)
  @IsString()
  @IsOptional()
  readonly username?: string;

  @IsString()
  @MinLength(8)
  readonly password: string;
}
