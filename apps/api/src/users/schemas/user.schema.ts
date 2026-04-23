import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Role } from '../enums/role.enum';

@Schema({ timestamps: false })
export class User {
  @Prop({ type: Types.ObjectId })
  _id: Types.ObjectId;

  @Prop({ type: String, enum: Role, required: true, immutable: true })
  role: Role;

  @Prop({ type: String, sparse: true, lowercase: true })
  email?: string;

  @Prop({ type: String, sparse: true })
  username?: string;

  @Prop({ type: Types.ObjectId, ref: 'Clinic' })
  clinicId?: Types.ObjectId;

  @Prop({ type: String, required: true, select: false })
  passwordHash: string;

  @Prop({ type: Date, default: () => new Date() })
  createdAt: Date;
}

export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ role: 1, email: 1 }, { unique: true, sparse: true });
UserSchema.index({ clinicId: 1, username: 1 }, { unique: true, sparse: true });
