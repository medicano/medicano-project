import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../auth.service';
import { RedisService } from '../redis.service';
import { UsersService } from '../../users/users.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: UsersService;
  let redisService: RedisService;
  let jwtService: JwtService;

  const mockUser = {
    _id: '507f1f77bcf86cd799439011',
    username: 'testuser',
    password: '$2b$10$hashedPassword',
    roles: ['User'],
    save: jest.fn().mockResolvedValue(this),
  };

  const mockUsersService = {
    findByUsername: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
  };

  const mockRedisService = {
    saveToken: jest.fn(),
    getToken: jest.fn(),
    validateToken: jest.fn(),
    removeToken: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    redisService = module.get<RedisService>(RedisService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('hashPassword', () => {
    it('should hash a plain text password', async () => {
      const plainPassword = 'password123';
      const hashedPassword = '$2b$10$hashedPassword';

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const result = await authService.hashPassword(plainPassword);

      expect(bcrypt.hash).toHaveBeenCalledWith(plainPassword, 10);
      expect(result).toBe(hashedPassword);
    });
  });

  describe('signup', () => {
    it('should create a new user and return access token', async () => {
      const createUserDto = {
        username: 'newuser',
        password: 'password123',
        roles: ['User'],
      };

      const hashedPassword = '$2b$10$hashedPassword';
      const accessToken = 'jwt.token.here';

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockUsersService.create.mockResolvedValue({
        ...mockUser,
        username: createUserDto.username,
        password: hashedPassword,
      });
      mockJwtService.sign.mockReturnValue(accessToken);
      mockRedisService.saveToken.mockResolvedValue(undefined);

      const result = await authService.signup(createUserDto);

      expect(bcrypt.hash).toHaveBeenCalledWith(createUserDto.password, 10);
      expect(mockUsersService.create).toHaveBeenCalledWith({
        ...createUserDto,
        password: hashedPassword,
      });
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockUser._id,
        username: createUserDto.username,
        roles: createUserDto.roles,
      });
      expect(mockRedisService.saveToken).toHaveBeenCalledWith(
        mockUser._id,
        accessToken,
      );
      expect(result).toEqual({ accessToken });
    });
  });

  describe('loginStandard', () => {
    it('should return access token for valid credentials', async () => {
      const loginDto = {
        username: 'testuser',
        password: 'password123',
      };

      const accessToken = 'jwt.token.here';

      mockUsersService.findByUsername.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue(accessToken);
      mockRedisService.saveToken.mockResolvedValue(undefined);

      const result = await authService.loginStandard(loginDto);

      expect(mockUsersService.findByUsername).toHaveBeenCalledWith(
        loginDto.username,
      );
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.password,
      );
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockUser._id,
        username: mockUser.username,
        roles: mockUser.roles,
      });
      expect(mockRedisService.saveToken).toHaveBeenCalledWith(
        mockUser._id,
        accessToken,
      );
      expect(result).toEqual({ accessToken });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const loginDto = {
        username: 'nonexistent',
        password: 'password123',
      };

      mockUsersService.findByUsername.mockResolvedValue(null);

      await expect(authService.loginStandard(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      const loginDto = {
        username: 'testuser',
        password: 'wrongpassword',
      };

      mockUsersService.findByUsername.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.loginStandard(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('loginAttendant', () => {
    it('should return access token with clinicId for valid attendant credentials', async () => {
      const loginDto = {
        username: 'attendant',
        password: 'password123',
        clinicId: 'clinic123',
      };

      const attendantUser = {
        ...mockUser,
        username: 'attendant',
        roles: ['Attendant'],
        clinics: ['clinic123', 'clinic456'],
      };

      const accessToken = 'jwt.token.here';

      mockUsersService.findByUsername.mockResolvedValue(attendantUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue(accessToken);
      mockRedisService.saveToken.mockResolvedValue(undefined);

      const result = await authService.loginAttendant(loginDto);

      expect(mockUsersService.findByUsername).toHaveBeenCalledWith(
        loginDto.username,
      );
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        attendantUser.password,
      );
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: attendantUser._id,
        username: attendantUser.username,
        roles: attendantUser.roles,
        clinicId: loginDto.clinicId,
      });
      expect(mockRedisService.saveToken).toHaveBeenCalledWith(
        attendantUser._id,
        accessToken,
      );
      expect(result).toEqual({ accessToken });
    });

    it('should throw UnauthorizedException if clinicId is not allowed', async () => {
      const loginDto = {
        username: 'attendant',
        password: 'password123',
        clinicId: 'unauthorizedClinic',
      };

      const attendantUser = {
        ...mockUser,
        username: 'attendant',
        roles: ['Attendant'],
        clinics: ['clinic123', 'clinic456'],
      };

      mockUsersService.findByUsername.mockResolvedValue(attendantUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(authService.loginAttendant(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const loginDto = {
        username: 'nonexistent',
        password: 'password123',
        clinicId: 'clinic123',
      };

      mockUsersService.findByUsername.mockResolvedValue(null);

      await expect(authService.loginAttendant(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should remove token from Redis', async () => {
      const userId = '507f1f77bcf86cd799439011';

      mockRedisService.removeToken.mockResolvedValue(undefined);

      const result = await authService.logout(userId);

      expect(mockRedisService.removeToken).toHaveBeenCalledWith(userId);
      expect(result).toEqual({ success: true });
    });
  });
});
