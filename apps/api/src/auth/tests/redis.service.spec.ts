import { Test, TestingModule } from '@nestjs/testing';
import Redis from 'ioredis-mock';
import { RedisService } from '../redis.service';

describe('RedisService', () => {
  let redisService: RedisService;
  let redisClient: Redis;

  beforeEach(async () => {
    redisClient = new Redis();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: 'REDIS_CLIENT',
          useValue: redisClient,
        },
      ],
    }).compile();

    redisService = module.get<RedisService>(RedisService);
  });

  afterEach(async () => {
    await redisClient.flushall();
    await redisClient.quit();
  });

  describe('saveToken', () => {
    it('should save a token to Redis with correct key', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const token = 'jwt.token.here';

      await redisService.saveToken(userId, token);

      const savedToken = await redisClient.get(`auth_token:${userId}`);
      expect(savedToken).toBe(token);
    });

    it('should overwrite existing token for same userId', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const token1 = 'jwt.token.first';
      const token2 = 'jwt.token.second';

      await redisService.saveToken(userId, token1);
      await redisService.saveToken(userId, token2);

      const savedToken = await redisClient.get(`auth_token:${userId}`);
      expect(savedToken).toBe(token2);
    });
  });

  describe('getToken', () => {
    it('should retrieve a token from Redis', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const token = 'jwt.token.here';

      await redisClient.set(`auth_token:${userId}`, token);

      const retrievedToken = await redisService.getToken(userId);
      expect(retrievedToken).toBe(token);
    });

    it('should return null if token does not exist', async () => {
      const userId = 'nonexistent';

      const retrievedToken = await redisService.getToken(userId);
      expect(retrievedToken).toBeNull();
    });
  });

  describe('validateToken', () => {
    it('should return true if token matches stored token', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const token = 'jwt.token.here';

      await redisClient.set(`auth_token:${userId}`, token);

      const isValid = await redisService.validateToken(userId, token);
      expect(isValid).toBe(true);
    });

    it('should return false if token does not match', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const storedToken = 'jwt.token.stored';
      const providedToken = 'jwt.token.different';

      await redisClient.set(`auth_token:${userId}`, storedToken);

      const isValid = await redisService.validateToken(userId, providedToken);
      expect(isValid).toBe(false);
    });

    it('should return false if no token is stored', async () => {
      const userId = 'nonexistent';
      const token = 'jwt.token.here';

      const isValid = await redisService.validateToken(userId, token);
      expect(isValid).toBe(false);
    });
  });

  describe('removeToken', () => {
    it('should remove a token from Redis', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const token = 'jwt.token.here';

      await redisClient.set(`auth_token:${userId}`, token);

      await redisService.removeToken(userId);

      const retrievedToken = await redisClient.get(`auth_token:${userId}`);
      expect(retrievedToken).toBeNull();
    });

    it('should not throw error if token does not exist', async () => {
      const userId = 'nonexistent';

      await expect(redisService.removeToken(userId)).resolves.not.toThrow();
    });
  });
});
