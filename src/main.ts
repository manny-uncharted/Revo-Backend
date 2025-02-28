import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as session from 'express-session';
import * as dotenv from 'dotenv';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { createClient } from 'redis';

// Use require for connect-redis
const RedisStoreFactory = require('connect-redis');
const RedisStore = RedisStoreFactory(session);

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set up the Redis client in legacy mode for connect-redis compatibility
  const redisClient = createClient({
    legacyMode: true,
    url:
      process.env.REDIS_URL ||
      `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
    password: process.env.REDIS_PASSWORD,
  });
  redisClient.on('error', (err) => console.error('Redis Client Error', err));
  await redisClient.connect().catch(console.error);

  // Configure session middleware
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    throw new Error(
      'SESSION_SECRET is not defined in your environment variables',
    );
  }
  app.use(
    session({
      store: new RedisStore({ client: redisClient }),
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
    }),
  );

  // Set up global validation pipe and exception filter
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
