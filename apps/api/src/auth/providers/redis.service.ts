import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    this.client = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      db: this.configService.get<number>('REDIS_DB', 0),
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  async storeToken(userId: string, rawToken: string): Promise<void> {
    const key = `auth:token:${userId}`;
    await this.client.sadd(key, rawToken);
    const ttl = this.configService.get<number>('JWT_EXPIRATION_SECONDS', 3600);
    await this.client.expire(key, ttl);
  }

  async validateToken(userId: string, rawToken: string): Promise<boolean> {
    const key = `auth:token:${userId}`;
    const exists = await this.client.sismember(key, rawToken);
    return exists === 1;
  }

  async removeToken(userId: string, rawToken: string): Promise<void> {
    const key = `auth:token:${userId}`;
    await this.client.srem(key, rawToken);
  }

  async removeAllTokens(userId: string): Promise<void> {
    const key = `auth:token:${userId}`;
    await this.client.del(key);
  }
}
