import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../auth.service';
import { RedisService } from '../../redis/redis.service';
import { User } from '../schemas/user.schema';
import { Role } from '../../common/enums/role.enum';

jest.mock('bcrypt');

const mockSave = jest.fn();

function MockUserModel(this: any, dto: any) {
  Object.assign(this, {
    ...dto,
    _id: { toString: () => '507f1f77bcf86cd799439011' },
    save: mockSave,
  });
}
MockUserModel.findOne = jest.fn();
MockUserModel.findById = jest.fn();

const mockRedisService = {
  saveToken: jest.fn(),
  getToken: jest.fn(),
  removeToken: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn(),
};

describe('AuthService', () => {
  let authService: AuthService;

  const existingUser = {
    _id: { toString: () => '507f1f77bcf86cd799439011' },
    email: 'test@test.com',
    username: 'testuser',
    passwordHash: '$2b$10$hashedPassword',
    role: Role.PATIENT,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getModelToken(User.name), useValue: MockUserModel },
        { provide: RedisService, useValue: mockRedisService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('signup', () => {
    const signupDto = {
      name: 'Test User',
      email: 'test@test.com',
      password: 'password123',
      role: Role.PATIENT,
    };

    it('should create a new user and return access token', async () => {
      MockUserModel.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      mockSave.mockResolvedValue(undefined);
      mockJwtService.sign.mockReturnValue('jwt.token.here');
      mockRedisService.saveToken.mockResolvedValue(undefined);

      const result = await authService.signup(signupDto);

      expect(result.accessToken).toBe('jwt.token.here');
      expect(result.expiresIn).toBe(604800);
      expect(mockRedisService.saveToken).toHaveBeenCalled();
    });

    it('should throw ConflictException if user already exists', async () => {
      MockUserModel.findOne.mockResolvedValue(existingUser);

      await expect(authService.signup(signupDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('loginStandard', () => {
    const loginDto = { email: 'test@test.com', password: 'password123' };

    it('should return access token for valid credentials', async () => {
      MockUserModel.findOne.mockResolvedValue(existingUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('jwt.token.here');
      mockRedisService.saveToken.mockResolvedValue(undefined);

      const result = await authService.loginStandard(loginDto);

      expect(result.accessToken).toBe('jwt.token.here');
      expect(result.expiresIn).toBe(604800);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      MockUserModel.findOne.mockResolvedValue(null);

      await expect(authService.loginStandard(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      MockUserModel.findOne.mockResolvedValue(existingUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.loginStandard(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should remove token from Redis', async () => {
      mockRedisService.removeToken.mockResolvedValue(undefined);

      await expect(authService.logout('507f1f77bcf86cd799439011')).resolves.not.toThrow();
      expect(mockRedisService.removeToken).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    });
  });
});
