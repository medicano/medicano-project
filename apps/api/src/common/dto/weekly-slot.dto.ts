import { IsInt, Min, Max, Matches } from 'class-validator';

export class WeeklySlotDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @Matches(/^([01]?\d|2[0-3]):[0-5]\d$/)
  startTime!: string;

  @Matches(/^([01]?\d|2[0-3]):[0-5]\d$/)
  endTime!: string;

  @IsInt()
  @Min(15)
  @Max(240)
  slotDurationMinutes!: number;
}
