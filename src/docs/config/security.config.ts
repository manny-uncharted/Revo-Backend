import { ThrottlerModuleOptions } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';

export const getThrottlerConfig = (configService: ConfigService): ThrottlerModuleOptions => {
  return {
    ttl: configService.get<number>('THROTTLE_TTL') || 900, // 15 minutes in seconds
    limit: configService.get<number>('THROTTLE_LIMIT') || 100,
  };
};

export const jwtConstants = {
  secret: process.env.JWT_SECRET || (() => {
    console.error('WARNING: JWT_SECRET not set! Using a random secret that will change on restart.');
    return require('crypto').randomBytes(32).toString('hex');
  })(),
  expiresIn: process.env.ACCESS_TOKEN_EXPIRATION || '3600s', // 1 hour
};

export const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://revofarmers.app',
  ],
  credentials: true,
};
