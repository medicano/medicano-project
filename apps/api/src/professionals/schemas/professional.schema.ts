import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProfessionalDocument = Professional & Document;

@Schema({ timestamps: true })
export class Professional {
  @Prop({ type: String, required: true })
  specialty: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  })
  userId: Types.ObjectId;
}

export const ProfessionalSchema = SchemaFactory.createForClass(Professional);
