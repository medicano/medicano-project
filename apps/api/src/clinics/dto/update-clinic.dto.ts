import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { SubscriptionStatus } from '../schemas/clinic.schema';

export class UpdateClinicDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsEnum(SubscriptionStatus)
  @IsOptional()
  subscriptionStatus?: SubscriptionStatus;
}
