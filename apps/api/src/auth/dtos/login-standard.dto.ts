import { IsEmail, IsNotEmpty } from 'class-validator';

export class LoginStandardDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  password: string;
}
