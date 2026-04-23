import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from '../jwt.strategy';
import { RedisService } from '../../redis/redis.service';
import { Role } from '../../common/enums/role.enum';

const mockRedisService = {
  getToken: jest.fn(),
};

const mockConfigService = {
  get: jest.fn().mockReturnValue('test-secret'),
};

describe('JwtStrategy', () => {
  let jwtStrategy: JwtStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: RedisService, useValue: mockRedisService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    jwtStrategy = module.get<JwtStrategy>(JwtStrategy);
  });

  afterEach(() => jest.clearAllMocks());

  describe('validate', () => {
    const payload = { sub: '507f1f77bcf86cd799439011', role: Role.PATIENT };

    it('should return user payload when token is in Redis', async () => {
      mockRedisService.getToken.mockResolvedValue('some.stored.token');

      const result = await jwtStrategy.validate(payload);

      expect(mockRedisService.getToken).toHaveBeenCalledWith(payload.sub);
      expect(result).toEqual({ userId: payload.sub, role: payload.role });
    });

    it('should throw UnauthorizedException when no token in Redis', async () => {
      mockRedisService.getToken.mockResolvedValue(null);

      await expect(jwtStrategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
