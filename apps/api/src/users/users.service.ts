import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '../auth/schemas/user.schema';
import { Role } from '../common/enums/role.enum';
import { CreateUserDto } from './dto/create-user.dto';

const BCRYPT_COST = 12;

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async createUser(dto: CreateUserDto): Promise<UserDocument> {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);
    const newUser = new this.userModel({
      role: dto.role,
      email: dto.email,
      username: dto.username,
      clinicId: dto.clinicId,
      passwordHash,
    });
    try {
      return await newUser.save();
    } catch (error: unknown) {
      if ((error as { code?: number }).code === 11000) {
        throw new ConflictException('User already exists');
      }
      throw error;
    }
  }

  async comparePassword(
    password: string,
    passwordHash: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, passwordHash);
  }

  async getById(id: string): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Invalid user ID: ${id}`);
    }
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByEmailAndRole(
    email: string,
    role: Role,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email, role })
      .select('+passwordHash')
      .exec();
  }

  async findByClinicIdAndUsername(
    clinicId: string,
    username: string,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ clinicId: new Types.ObjectId(clinicId), username })
      .select('+passwordHash')
      .exec();
  }
}
