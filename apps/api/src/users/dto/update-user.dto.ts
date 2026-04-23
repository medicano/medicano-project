import { IsOptional, IsString, IsMongoId, MinLength, ValidateIf, IsEmail } from 'class-validator';
import { Role } from '../enums/role.enum';

export class UpdateUserDto {
  @IsEmail()
  @IsString()
  @IsOptional()
  readonly email?: string;

  @IsMongoId()
  @IsOptional()
  readonly clinicId?: string;

  @IsString()
  @IsOptional()
  readonly username?: string;

  @IsString()
  @MinLength(8)
  @IsOptional()
  readonly password?: string;
}
