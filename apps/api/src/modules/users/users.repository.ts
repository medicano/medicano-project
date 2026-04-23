import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IUser } from './interfaces/user.interface';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectModel('User') private readonly userModel: Model<IUser>
  ) {}

  async create(email: string, hashedPassword: string, role: string): Promise<IUser> {
    const user = new this.userModel({
      email,
      password: hashedPassword,
      role,
    });
    return user.save();
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findById(id: string): Promise<IUser | null> {
    return this.userModel.findById(id).exec();
  }
}
