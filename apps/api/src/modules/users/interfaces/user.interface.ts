import { Document } from 'mongoose';
import { UserRole } from '../../auth/constants';

export interface IUser extends Document {
  email: string;
  password: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}
