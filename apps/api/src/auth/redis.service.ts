import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_TOKEN_KEY_PREFIX } from './constants';

export interface IRedisService {
  saveToken(userId: string, token: string, ttlSeconds: number): Promise<void>;
  getToken(userId: string): Promise<string | null>;
  validateToken(userId: string, token: string): Promise<boolean>;
  removeToken(userId: string): Promise<void>;
}

@Injectable()
export class RedisService implements IRedisService, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly redisClient: Redis;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>(
      'REDIS_URL',
      'redis://localhost:6379',
    );
    this.redisClient = new Redis(redisUrl);

    this.redisClient.on('connect', () => {
      this.logger.log('Redis client connected');
    });

    this.redisClient.on('error', (err) => {
      this.logger.error('Redis client error', err);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.redisClient.quit();
  }

  private getKey(userId: string): string {
    return `${REDIS_TOKEN_KEY_PREFIX}${userId}`;
  }

  async saveToken(
    userId: string,
    token: string,
    ttlSeconds: number,
  ): Promise<void> {
    const key = this.getKey(userId);
    await this.redisClient.setex(key, ttlSeconds, token);
    this.logger.debug(`Token saved for user ${userId} with TTL ${ttlSeconds}s`);
  }

  async getToken(userId: string): Promise<string | null> {
    const key = this.getKey(userId);
    const token = await this.redisClient.get(key);
    return token;
  }

  async validateToken(userId: string, token: string): Promise<boolean> {
    const storedToken = await this.getToken(userId);
    if (!storedToken) {
      this.logger.debug(`No token found for user ${userId}`);
      return false;
    }
    const isValid = storedToken === token;
    this.logger.debug(
      `Token validation for user ${userId}: ${isValid ? 'valid' : 'invalid'}`,
    );
    return isValid;
  }

  async removeToken(userId: string): Promise<void> {
    const key = this.getKey(userId);
    await this.redisClient.del(key);
    this.logger.debug(`Token removed for user ${userId}`);
  }
}
