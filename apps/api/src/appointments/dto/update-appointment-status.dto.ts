import { IsEnum } from 'class-validator';
import { AppointmentStatus } from '../schemas/appointment.schema';

export class UpdateAppointmentStatusDto {
  @IsEnum(AppointmentStatus)
  readonly status: AppointmentStatus;
}
