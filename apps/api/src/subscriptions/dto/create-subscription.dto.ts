import { IsDateString, IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { SubscriptionPlan } from '../schemas/subscription.schema';

/**
 * DTO: CreateSubscriptionDto
 * All properties are readonly to guarantee immutability.
 */
export class CreateSubscriptionDto {
  @IsMongoId()
  readonly clinicId!: string;

  @IsEnum(SubscriptionPlan)
  @IsOptional()
  readonly plan?: SubscriptionPlan;

  @IsDateString()
  readonly expiresAt!: string;
}
