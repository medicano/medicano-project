import { Role } from '../enums/role.enum';
import { Types } from 'mongoose';

export interface User {
  _id: Types.ObjectId;
  role: Role;
  email?: string;
  username?: string;
  clinicId?: Types.ObjectId;
  createdAt: Date;
}

export type UserDocument = import('../schemas/user.schema').UserDocument;
