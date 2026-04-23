import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User } from './schemas/user.schema';
import { UserRole } from '../auth/enums/user-role.enum';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(id).exec();
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async validateUserCredentials(email: string, password: string): Promise<User | null> {
    const user = await this.findByEmail(email);
    
    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async create(email: string, password: string, role: UserRole = UserRole.USER): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const newUser = new this.userModel({
      email,
      password: hashedPassword,
      role,
    });

    return newUser.save();
  }
}
