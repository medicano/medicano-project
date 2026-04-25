import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Specialty } from '../../common/enums/specialty.enum';
import { Address, AddressSchema } from '../../common/schemas/address.schema';
import {
  WeeklySlot,
  WeeklySlotSchema,
} from '../../common/schemas/weekly-slot.schema';

@Schema({ timestamps: true })
export class Professional {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: Specialty, required: true })
  specialty: Specialty;

  @Prop({ type: String, required: true, unique: true })
  cpf: string;

  @Prop({ type: String, required: true })
  registration: string;

  @Prop({ type: AddressSchema, required: true })
  address: Address;

  @Prop({ type: String })
  phone?: string;

  @Prop({ type: String, maxlength: 1000 })
  description?: string;

  @Prop({ type: [WeeklySlotSchema], default: [] })
  weeklySlots: WeeklySlot[];
}

export type ProfessionalDocument = Professional & Document;
export const ProfessionalSchema = SchemaFactory.createForClass(Professional);

ProfessionalSchema.index({ 'address.city': 1, specialty: 1 });
ProfessionalSchema.index({ cpf: 1 }, { unique: true });
