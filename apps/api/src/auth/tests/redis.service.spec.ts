import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';

const mockRedisClient = {
  setex: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
  quit: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
};

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedisClient);
});

const mockConfigService = {
  get: jest.fn().mockReturnValue(undefined),
};

describe('RedisService', () => {
  let redisService: RedisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    redisService = module.get<RedisService>(RedisService);
    await redisService.onModuleInit();
  });

  afterEach(() => jest.clearAllMocks());

  describe('saveToken', () => {
    it('should save a token with correct key and TTL', async () => {
      await redisService.saveToken('userId1', 'jwt.token', 3600);

      expect(mockRedisClient.setex).toHaveBeenCalledWith('auth:token:userId1', 3600, 'jwt.token');
    });

    it('should overwrite existing token for same userId', async () => {
      await redisService.saveToken('userId1', 'first.token', 3600);
      await redisService.saveToken('userId1', 'second.token', 3600);

      expect(mockRedisClient.setex).toHaveBeenCalledTimes(2);
      expect(mockRedisClient.setex).toHaveBeenLastCalledWith('auth:token:userId1', 3600, 'second.token');
    });
  });

  describe('getToken', () => {
    it('should retrieve a stored token', async () => {
      mockRedisClient.get.mockResolvedValue('jwt.token');

      const result = await redisService.getToken('userId1');

      expect(mockRedisClient.get).toHaveBeenCalledWith('auth:token:userId1');
      expect(result).toBe('jwt.token');
    });

    it('should return null if token does not exist', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await redisService.getToken('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('removeToken', () => {
    it('should delete the token with correct key', async () => {
      await redisService.removeToken('userId1');

      expect(mockRedisClient.del).toHaveBeenCalledWith('auth:token:userId1');
    });

    it('should not throw if token does not exist', async () => {
      mockRedisClient.del.mockResolvedValue(0);

      await expect(redisService.removeToken('nonexistent')).resolves.not.toThrow();
    });
  });
});
