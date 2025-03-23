/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  redisService: any;
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async setCache(key: string, value: any, ttl: number = 3600) {
    await this.redis.set(key, JSON.stringify(value), 'EX', ttl);
  }

  async getCache(key: string) {
    const data = await this.redis.get(key);
    return data;
  }
}
