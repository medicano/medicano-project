import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { UserRole } from '../enums/user-role.enum';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  clinicId: Types.ObjectId;

  @Prop({ type: String, enum: UserRole, required: true })
  role: UserRole;

  @Prop({ type: String, lowercase: true, unique: false, sparse: true })
  email?: string;

  @Prop({ type: String, lowercase: true, unique: false, sparse: true })
  username?: string;

  @Prop({ type: String, required: true, select: false })
  passwordHash: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
