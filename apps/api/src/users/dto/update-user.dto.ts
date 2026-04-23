import { IsEmail, IsMongoId, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @IsEmail()
  @IsOptional()
  readonly email?: string;

  @IsString()
  @IsOptional()
  readonly username?: string;

  @IsMongoId()
  @IsOptional()
  readonly clinicId?: string;
}
