import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WeeklySlotDto } from '../../common/dto/weekly-slot.dto';

export class UpdateProfessionalAvailabilityDto {
  @IsDateString()
  @IsOptional()
  readonly date?: string;

  @IsBoolean()
  @IsOptional()
  readonly isUnavailable?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeeklySlotDto)
  @IsOptional()
  readonly customSlots?: WeeklySlotDto[];
}
