import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from '../jwt.strategy';
import { RedisService } from '../redis.service';

describe('JwtStrategy', () => {
  let jwtStrategy: JwtStrategy;
  let redisService: RedisService;

  const mockRedisService = {
    validateToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    jwtStrategy = module.get<JwtStrategy>(JwtStrategy);
    redisService = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should return user payload for valid token', async () => {
      const payload = {
        sub: '507f1f77bcf86cd799439011',
        username: 'testuser',
        roles: ['User'],
      };

      const token = 'jwt.token.here';

      mockRedisService.validateToken.mockResolvedValue(true);

      const result = await jwtStrategy.validate(payload, token);

      expect(mockRedisService.validateToken).toHaveBeenCalledWith(
        payload.sub,
        token,
      );
      expect(result).toEqual({
        userId: payload.sub,
        username: payload.username,
        roles: payload.roles,
      });
    });

    it('should return user payload with clinicId for attendant', async () => {
      const payload = {
        sub: '507f1f77bcf86cd799439011',
        username: 'attendant',
        roles: ['Attendant'],
        clinicId: 'clinic123',
      };

      const token = 'jwt.token.here';

      mockRedisService.validateToken.mockResolvedValue(true);

      const result = await jwtStrategy.validate(payload, token);

      expect(mockRedisService.validateToken).toHaveBeenCalledWith(
        payload.sub,
        token,
      );
      expect(result).toEqual({
        userId: payload.sub,
        username: payload.username,
        roles: payload.roles,
        clinicId: payload.clinicId,
      });
    });

    it('should throw UnauthorizedException if token is not in Redis', async () => {
      const payload = {
        sub: '507f1f77bcf86cd799439011',
        username: 'testuser',
        roles: ['User'],
      };

      const token = 'jwt.token.invalid';

      mockRedisService.validateToken.mockResolvedValue(false);

      await expect(jwtStrategy.validate(payload, token)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if token does not match', async () => {
      const payload = {
        sub: '507f1f77bcf86cd799439011',
        username: 'testuser',
        roles: ['User'],
      };

      const token = 'jwt.token.wrong';

      mockRedisService.validateToken.mockResolvedValue(false);

      await expect(jwtStrategy.validate(payload, token)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockRedisService.validateToken).toHaveBeenCalledWith(
        payload.sub,
        token,
      );
    });
  });
});
