import { IsMongoId, IsDateString, IsInt, Min, Max, IsString, IsOptional } from 'class-validator';

export class CreateAppointmentDto {
  @IsMongoId()
  readonly clinicId: string;

  @IsMongoId()
  readonly professionalId: string;

  @IsMongoId()
  readonly patientId: string;

  @IsDateString()
  readonly startAt: string;

  @IsInt()
  @Min(15)
  @Max(480)
  readonly durationMinutes: number;

  @IsString()
  @IsOptional()
  readonly notes?: string;
}
