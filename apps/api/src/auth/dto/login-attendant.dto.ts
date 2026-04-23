import { IsMongoId, IsString, MinLength } from 'class-validator';

export class LoginAttendantDto {
  @IsMongoId()
  clinicId: string;

  @IsString()
  username: string;

  @IsString()
  @MinLength(8)
  password: string;
}
