import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { UserRole } from './enums/user-role.enum';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(data: Partial<UserDocument>): Promise<UserDocument> {
    const user = new this.userModel(data);
    return user.save();
  }

  async findByEmailAndRole(email: string, role: UserRole): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase(), role }).exec();
  }

  async findByClinicIdAndUsername(clinicId: string, username: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ clinicId, username: username.toLowerCase() }).exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }
}
