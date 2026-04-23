import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Role } from '../../common/enums/role.enum';

@Schema({ timestamps: true })
export class User {
  @Prop({ type: String, enum: Role, required: true })
  role: Role;

  @Prop({ type: String, unique: true, sparse: true })
  email?: string;

  @Prop({ type: String, unique: true, sparse: true })
  username?: string;

  @Prop({ type: Types.ObjectId, ref: 'Clinic', sparse: true })
  clinicId?: Types.ObjectId;

  @Prop({ type: String, required: true })
  passwordHash: string;
}

export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);
