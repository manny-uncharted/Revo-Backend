// src/redis/redis.module.ts
import { Module, DynamicModule } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Module({})
export class RedisModule {
  static forRoot(): DynamicModule {
    const redisClientProvider = {
      provide: 'REDIS_CLIENT',
      useFactory: async () => {
        const client: RedisClientType = createClient({
          url:
            process.env.REDIS_URL ||
            `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
          password: process.env.REDIS_PASSWORD,
        });
        client.on('error', (err) => console.error('Redis Client Error', err));
        await client.connect().catch(console.error);
        return client;
      },
    };

    return {
      module: RedisModule,
      providers: [redisClientProvider],
      exports: [redisClientProvider],
      global: true,
    };
  }
}