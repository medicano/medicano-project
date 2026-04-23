import { Schema, Model, model } from 'mongoose';
import { IUser } from '../interfaces/user.interface';
import { UserRole } from '../../auth/constants';

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: Object.values(UserRole), required: true },
  },
  { timestamps: true }
);

export const UserModel: Model<IUser> = model<IUser>('User', UserSchema);
