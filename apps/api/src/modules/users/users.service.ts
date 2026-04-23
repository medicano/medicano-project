import { Injectable, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from './users.repository';
import { IUser } from './interfaces/user.interface';
import { UserRole } from '../auth/constants';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async createUser(email: string, password: string, role: UserRole): Promise<IUser> {
    const existingUser = await this.usersRepository.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    return this.usersRepository.create(email, hashedPassword, role);
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return this.usersRepository.findByEmail(email);
  }

  async findById(id: string): Promise<IUser | null> {
    return this.usersRepository.findById(id);
  }

  async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
}
