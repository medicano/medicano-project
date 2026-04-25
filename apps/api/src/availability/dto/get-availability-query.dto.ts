import { IsDateString } from 'class-validator';

export class GetAvailabilityQueryDto {
  @IsDateString()
  readonly date: string;
}
