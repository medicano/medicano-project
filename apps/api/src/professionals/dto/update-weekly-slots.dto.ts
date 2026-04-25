import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { WeeklySlotDto } from '../../common/dto/weekly-slot.dto';

export class UpdateWeeklySlotsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeeklySlotDto)
  readonly weeklySlots: WeeklySlotDto[];
}
