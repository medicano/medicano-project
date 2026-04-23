import { IsNotEmpty } from 'class-validator';

export class LoginAttendantDto {
  @IsNotEmpty()
  clinicId: string;

  @IsNotEmpty()
  username: string;

  @IsNotEmpty()
  password: string;
}
