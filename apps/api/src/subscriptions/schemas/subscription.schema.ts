import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { SubscriptionStatus } from '../../clinics/schemas/clinic.schema';

export enum SubscriptionPlan {
  FREE = 'free',
  BASIC = 'basic',
  PRO = 'pro',
}

export const PLAN_PROFESSIONAL_LIMITS: Record<SubscriptionPlan, number> = {
  [SubscriptionPlan.FREE]: 2,
  [SubscriptionPlan.BASIC]: 10,
  [SubscriptionPlan.PRO]: -1,
};

@Schema({ timestamps: true })
export class Subscription {
  @Prop({ type: Types.ObjectId, ref: 'Clinic', required: true, unique: true })
  clinicId: Types.ObjectId;

  @Prop({
    type: String,
    enum: SubscriptionPlan,
    default: SubscriptionPlan.FREE,
  })
  plan: SubscriptionPlan;

  @Prop({
    type: String,
    enum: SubscriptionStatus,
    default: SubscriptionStatus.TRIAL,
  })
  status: SubscriptionStatus;

  @Prop({ type: Date, required: true })
  expiresAt: Date;
}

export type SubscriptionDocument = Subscription & Document;
export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);

SubscriptionSchema.index({ clinicId: 1 }, { unique: true });
