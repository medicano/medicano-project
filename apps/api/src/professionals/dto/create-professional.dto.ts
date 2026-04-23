import { IsString, IsNotEmpty, IsMongoId } from 'class-validator';

export class CreateProfessionalDto {
  @IsString()
  @IsNotEmpty()
  specialty: string;

  @IsMongoId()
  @IsNotEmpty()
  userId: string;
}
