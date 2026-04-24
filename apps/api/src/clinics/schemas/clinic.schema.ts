import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ClinicDocument = Clinic & Document;

export enum SubscriptionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  TRIAL = 'trial',
  CANCELED = 'canceled',
  EXPIRED = 'expired',
}

@Schema({ timestamps: true })
export class Clinic {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({
    type: String,
    enum: SubscriptionStatus,
    default: SubscriptionStatus.TRIAL,
  })
  subscriptionStatus: SubscriptionStatus;
}

export const ClinicSchema = SchemaFactory.createForClass(Clinic);
