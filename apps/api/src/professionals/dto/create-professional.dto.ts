import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Specialty } from '../../common/enums/specialty.enum';
import { AddressDto } from '../../common/dto/address.dto';

export class CreateProfessionalDto {
  @IsMongoId()
  @IsNotEmpty()
  readonly userId: string;

  @IsEnum(Specialty)
  readonly specialty: Specialty;

  @IsString()
  @Matches(/^\d{11}$/)
  readonly cpf: string;

  @IsString()
  @IsNotEmpty()
  readonly registration: string;

  @ValidateNested()
  @Type(() => AddressDto)
  readonly address: AddressDto;

  @IsString()
  @IsOptional()
  readonly phone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  readonly description?: string;
}
