import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { RedisService } from '../../redis/redis.service';
import { UsersService } from '../../users/users.service';
import { Role } from '../../common/enums/role.enum';

const mockUserId = '507f1f77bcf86cd799439011';

const existingUser = {
  _id: { toString: () => mockUserId },
  email: 'test@test.com',
  passwordHash: '$2b$12$hashedPassword',
  role: Role.PATIENT,
};

const attendantUser = {
  _id: { toString: () => mockUserId },
  username: 'attendant01',
  passwordHash: '$2b$12$hashedPassword',
  role: Role.ATTENDANT,
};

const mockUsersService = {
  createUser: jest.fn(),
  comparePassword: jest.fn(),
  getById: jest.fn(),
  findByEmailAndRole: jest.fn(),
  findByClinicIdAndUsername: jest.fn(),
};

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── signup ────────────────────────────────────────────────────────────────

  describe('signup', () => {
    const signupDto = {
      email: 'test@test.com',
      password: 'password123',
      role: Role.PATIENT,
    };

    it('should create a new user, store JWT in Redis, and return accessToken', async () => {
      mockUsersService.createUser.mockResolvedValue(existingUser);
      mockJwtService.sign.mockReturnValue('jwt.token.here');
      mockRedisService.saveToken.mockResolvedValue(undefined);

      const result = await authService.signup(signupDto);

      expect(mockUsersService.createUser).toHaveBeenCalledWith(signupDto);
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockUserId,
        role: Role.PATIENT,
      });
      expect(mockRedisService.saveToken).toHaveBeenCalledWith(
        mockUserId,
        'jwt.token.here',
        7 * 24 * 3600,
      );
      expect(result).toEqual({ accessToken: 'jwt.token.here' });
    });

    it('should propagate ConflictException if user already exists', async () => {
      mockUsersService.createUser.mockRejectedValue(
        new ConflictException('User already exists'),
      );

      await expect(authService.signup(signupDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // ─── loginStandard ─────────────────────────────────────────────────────────

  describe('loginStandard', () => {
    const loginDto = { email: 'test@test.com', password: 'password123' };

    it('should return accessToken for valid credentials', async () => {
      mockUsersService.findByEmailAndRole.mockResolvedValue(existingUser);
      mockUsersService.comparePassword.mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('jwt.token.here');
      mockRedisService.saveToken.mockResolvedValue(undefined);

      const result = await authService.loginStandard(loginDto);

      expect(mockUsersService.findByEmailAndRole).toHaveBeenCalledWith(
        loginDto.email,
        Role.PATIENT,
      );
      expect(mockUsersService.comparePassword).toHaveBeenCalledWith(
        loginDto.password,
        existingUser.passwordHash,
      );
      expect(mockRedisService.saveToken).toHaveBeenCalledWith(
        mockUserId,
        'jwt.token.here',
        7 * 24 * 3600,
      );
      expect(result).toEqual({ accessToken: 'jwt.token.here' });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUsersService.findByEmailAndRole.mockResolvedValue(null);

      await expect(authService.loginStandard(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      mockUsersService.findByEmailAndRole.mockResolvedValue(existingUser);
      mockUsersService.comparePassword.mockResolvedValue(false);

      await expect(authService.loginStandard(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ─── loginAttendant ────────────────────────────────────────────────────────

  describe('loginAttendant', () => {
    const loginDto = {
      clinicId: '507f1f77bcf86cd799439022',
      username: 'attendant01',
      password: 'password123',
    };

    it('should return accessToken for valid attendant credentials', async () => {
      mockUsersService.findByClinicIdAndUsername.mockResolvedValue(
        attendantUser,
      );
      mockUsersService.comparePassword.mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('jwt.attendant.token');
      mockRedisService.saveToken.mockResolvedValue(undefined);

      const result = await authService.loginAttendant(loginDto);

      expect(mockUsersService.findByClinicIdAndUsername).toHaveBeenCalledWith(
        loginDto.clinicId,
        loginDto.username,
      );
      expect(mockUsersService.comparePassword).toHaveBeenCalledWith(
        loginDto.password,
        attendantUser.passwordHash,
      );
      expect(result).toEqual({ accessToken: 'jwt.attendant.token' });
    });

    it('should throw UnauthorizedException if attendant not found', async () => {
      mockUsersService.findByClinicIdAndUsername.mockResolvedValue(null);

      await expect(authService.loginAttendant(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      mockUsersService.findByClinicIdAndUsername.mockResolvedValue(
        attendantUser,
      );
      mockUsersService.comparePassword.mockResolvedValue(false);

      await expect(authService.loginAttendant(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ─── logout ────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('should call RedisService.removeToken with the correct userId', async () => {
      mockRedisService.removeToken.mockResolvedValue(undefined);

      await expect(authService.logout(mockUserId)).resolves.not.toThrow();
      expect(mockRedisService.removeToken).toHaveBeenCalledWith(mockUserId);
      expect(mockRedisService.removeToken).toHaveBeenCalledTimes(1);
    });
  });
});
