import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.client = new Redis({
      host: this.configService.get<string>('REDIS_HOST') || 'localhost',
      port: this.configService.get<number>('REDIS_PORT') || 6379,
      password: this.configService.get<string>('REDIS_PASSWORD'),
      db: this.configService.get<number>('REDIS_DB') || 0,
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  async saveToken(userId: string, token: string, ttl: number): Promise<void> {
    const key = `auth:token:${userId}`;
    await this.client.setex(key, ttl, token);
  }

  async getToken(userId: string): Promise<string | null> {
    const key = `auth:token:${userId}`;
    return await this.client.get(key);
  }

  async removeToken(userId: string): Promise<void> {
    const key = `auth:token:${userId}`;
    await this.client.del(key);
  }
}
