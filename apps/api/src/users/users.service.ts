import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from './enums/role.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    this.validateCreateDto(createUserDto);

    const passwordHash = await bcrypt.hash(createUserDto.password, 10);

    const userData: Partial<User> = {
      _id: new Types.ObjectId(),
      role: createUserDto.role,
      passwordHash,
      createdAt: new Date(),
    };

    if (createUserDto.role === Role.ATTENDANT) {
      if (!createUserDto.clinicId || !createUserDto.username) {
        throw new BadRequestException('Attendants must have clinicId and username');
      }
      userData.clinicId = new Types.ObjectId(createUserDto.clinicId);
      userData.username = createUserDto.username;
    } else {
      if (!createUserDto.email) {
        throw new BadRequestException('Non-attendant users must have email');
      }
      userData.email = createUserDto.email.toLowerCase();
    }

    try {
      const createdUser = new this.userModel(userData);
      return await createdUser.save();
    } catch (error: any) {
      if (error.code === 11000) {
        throw new ConflictException('User with this email or username already exists');
      }
      throw error;
    }
  }

  async findById(id: string): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.findById(id);

    const updateData: any = {};

    if (updateUserDto.email !== undefined) {
      if (user.role === Role.ATTENDANT) {
        throw new BadRequestException('Attendants cannot have email');
      }
      updateData.email = updateUserDto.email.toLowerCase();
    }

    if (updateUserDto.username !== undefined) {
      if (user.role !== Role.ATTENDANT) {
        throw new BadRequestException('Only attendants can have username');
      }
      updateData.username = updateUserDto.username;
    }

    if (updateUserDto.clinicId !== undefined) {
      if (user.role !== Role.ATTENDANT) {
        throw new BadRequestException('Only attendants can have clinicId');
      }
      updateData.clinicId = new Types.ObjectId(updateUserDto.clinicId);
    }

    if (updateUserDto.password) {
      updateData.passwordHash = await bcrypt.hash(updateUserDto.password, 10);
    }

    try {
      const updatedUser = await this.userModel
        .findByIdAndUpdate(id, updateData, { new: true })
        .exec();

      if (!updatedUser) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      return updatedUser;
    } catch (error: any) {
      if (error.code === 11000) {
        throw new ConflictException('User with this email or username already exists');
      }
      throw error;
    }
  }

  async remove(id: string): Promise<{ success: boolean }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID');
    }

    const result = await this.userModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return { success: true };
  }

  private validateCreateDto(dto: CreateUserDto): void {
    if (dto.role === Role.ATTENDANT) {
      if (!dto.clinicId) {
        throw new BadRequestException('Attendants must have clinicId');
      }
      if (!dto.username) {
        throw new BadRequestException('Attendants must have username');
      }
      if (dto.email) {
        throw new BadRequestException('Attendants cannot have email');
      }
    } else {
      if (!dto.email) {
        throw new BadRequestException('Non-attendant users must have email');
      }
      if (dto.clinicId) {
        throw new BadRequestException('Only attendants can have clinicId');
      }
      if (dto.username) {
        throw new BadRequestException('Only attendants can have username');
      }
    }
  }
}
