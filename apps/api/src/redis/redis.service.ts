import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

const KEY_PREFIX = 'auth:token:';

@Injectable()
export class RedisService {
  private readonly client: Redis;

  constructor(private readonly configService: ConfigService) {
    this.client = new Redis({
      host: this.configService.get<string>('REDIS_HOST') ?? 'localhost',
      port: this.configService.get<number>('REDIS_PORT') ?? 6379,
    });
  }

  async saveToken(userId: string, token: string, ttl: number): Promise<void> {
    await this.client.setex(`${KEY_PREFIX}${userId}`, ttl, token);
  }

  async getToken(userId: string): Promise<string | null> {
    return this.client.get(`${KEY_PREFIX}${userId}`);
  }

  async validateToken(userId: string, token: string): Promise<boolean> {
    const storedToken = await this.getToken(userId);
    return storedToken === token;
  }

  async removeToken(userId: string): Promise<void> {
    await this.client.del(`${KEY_PREFIX}${userId}`);
  }
}
