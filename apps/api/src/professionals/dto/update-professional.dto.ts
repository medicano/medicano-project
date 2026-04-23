import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateProfessionalDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  specialty?: string;
}
