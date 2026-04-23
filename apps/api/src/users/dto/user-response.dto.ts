import { Exclude, Expose } from 'class-transformer';
import { Role } from '../enums/role.enum';
import { Types } from 'mongoose';

export class UserResponseDto {
  @Expose()
  _id: Types.ObjectId;

  @Expose()
  role: Role;

  @Expose()
  email?: string;

  @Expose()
  username?: string;

  @Expose()
  clinicId?: Types.ObjectId;

  @Expose()
  createdAt: Date;

  @Exclude()
  passwordHash?: string;

  @Exclude()
  __v?: number;
}
