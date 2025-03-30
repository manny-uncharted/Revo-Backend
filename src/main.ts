import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as session from 'express-session';
import * as dotenv from 'dotenv';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { LoggerService } from './modules/logging/services/logger.service';
import { createClient } from 'redis';
import * as connectRedis from 'connect-redis';
import Redis from 'ioredis';

const RedisStore = connectRedis.RedisStore;
const redisClient = new Redis();

const redisStore = new RedisStore({
  client: redisClient,
  disableTouch: true,
});

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const redisClient = createClient({
    legacyMode: true,
    url:
      process.env.REDIS_URL ||
      `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
    password: process.env.REDIS_PASSWORD,
  });

  redisClient.on('error', (err) => console.error('Redis Client Error', err));

  // Retry mechanism for Redis connection
  const connectWithRetry = async (retries = 5) => {
    while (retries) {
      try {
        await redisClient.connect();
        console.log('Redis connected successfully');
        break;
      } catch (err) {
        console.error('Redis connection failed, retrying...', err);
        retries -= 1;
        await new Promise((res) => setTimeout(res, 5000)); // Wait for 5 seconds before retrying
      }
    }
    if (!retries) {
      throw new Error('Failed to connect to Redis after multiple attempts');
    }
  };

  await connectWithRetry();

  const redisStore = new RedisStore({ client: redisClient, prefix: 'myapp:' });

  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    // throw new Error(
    //   'SESSION_SECRET is not defined in your environment variables',
    // );
  }
  app.use(
    session.default({
      store: redisStore,
      secret: 'your_secret_key',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false },
    }),
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const logger = app.get(LoggerService);
  logger.setContext('Bootstrap');
  app.useLogger(logger);
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(process.env.PORT ?? 3000);

  logger.info(
    `Application is running on: http://localhost:${process.env.PORT}`,
  );
}

bootstrap();
