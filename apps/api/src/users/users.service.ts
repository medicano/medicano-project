import { Injectable, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserRole } from './enums/user-role.enum';
import { Types } from 'mongoose';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, 12);
  }

  async comparePassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  async createUser(dto: CreateUserDto): Promise<UserResponseDto> {
    // Validate role-based field requirements
    if (dto.role === UserRole.ATTENDANT) {
      if (!dto.username) {
        throw new BadRequestException('Username is required for attendant role');
      }
      if (dto.email) {
        throw new BadRequestException('Email must not be provided for attendant role');
      }
    } else {
      if (!dto.email) {
        throw new BadRequestException('Email is required for non-attendant roles');
      }
      if (dto.username) {
        throw new BadRequestException('Username must not be provided for non-attendant roles');
      }
    }

    // Check for duplicate email and role combination
    if (dto.email) {
      const existingByEmail = await this.usersRepository.findByEmailAndRole(dto.email, dto.role);
      if (existingByEmail) {
        throw new ConflictException('User with this email and role already exists');
      }
    }

    // Check for duplicate clinicId and username combination
    if (dto.username) {
      const existingByUsername = await this.usersRepository.findByClinicIdAndUsername(
        dto.clinicId,
        dto.username,
      );
      if (existingByUsername) {
        throw new ConflictException('User with this username already exists in this clinic');
      }
    }

    // Hash password
    const passwordHash = await this.hashPassword(dto.password);

    // Create user
    const user = await this.usersRepository.create({
      clinicId: new Types.ObjectId(dto.clinicId),
      role: dto.role,
      email: dto.email?.toLowerCase(),
      username: dto.username?.toLowerCase(),
      passwordHash,
    });

    return this.mapToResponseDto(user);
  }

  async getById(id: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.mapToResponseDto(user);
  }

  private mapToResponseDto(user: any): UserResponseDto {
    return {
      id: user._id.toString(),
      clinicId: user.clinicId.toString(),
      role: user.role,
      email: user.email,
      username: user.username,
    };
  }
}
