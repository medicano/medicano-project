import { IsDateString, IsInt, Min, Max, IsString, IsOptional } from 'class-validator';

export class UpdateAppointmentDto {
  @IsDateString()
  @IsOptional()
  readonly startAt?: string;

  @IsInt()
  @Min(15)
  @Max(480)
  @IsOptional()
  readonly durationMinutes?: number;

  @IsString()
  @IsOptional()
  readonly notes?: string;
}
