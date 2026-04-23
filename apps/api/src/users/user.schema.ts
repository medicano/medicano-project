import { Schema, Document } from 'mongoose';
import { UserRole } from '../auth/user.roles.enum';

export interface IUser extends Document {
  email?: string;
  username?: string;
  clinicId?: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = new Schema<IUser>(
  {
    email: { type: String, unique: true, sparse: true },
    username: { type: String, sparse: true },
    clinicId: { type: Schema.Types.ObjectId, ref: 'Clinic', sparse: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: Object.values(UserRole),
      required: true,
    },
  },
  { timestamps: true },
);

UserSchema.index({ clinicId: 1, username: 1 }, { unique: true, sparse: true });
