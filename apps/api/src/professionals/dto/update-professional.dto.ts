import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Specialty } from '../../common/enums/specialty.enum';
import { AddressDto } from '../../common/dto/address.dto';

export class UpdateProfessionalDto {
  @IsOptional()
  @IsEnum(Specialty)
  readonly specialty?: Specialty;

  @IsOptional()
  @IsString()
  @Matches(/^\d{11}$/)
  readonly cpf?: string;

  @IsOptional()
  @IsString()
  readonly registration?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  readonly address?: AddressDto;

  @IsOptional()
  @IsString()
  readonly phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  readonly description?: string;
}
