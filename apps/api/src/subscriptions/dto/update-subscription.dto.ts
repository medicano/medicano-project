import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { SubscriptionPlan } from '../schemas/subscription.schema';
import { SubscriptionStatus } from '../../clinics/schemas/clinic.schema';

/**
 * DTO: UpdateSubscriptionDto
 * All properties are readonly to guarantee immutability.
 */
export class UpdateSubscriptionDto {
  @IsEnum(SubscriptionPlan)
  @IsOptional()
  readonly plan?: SubscriptionPlan;

  @IsEnum(SubscriptionStatus)
  @IsOptional()
  readonly status?: SubscriptionStatus;

  @IsDateString()
  @IsOptional()
  readonly expiresAt?: string;
}
