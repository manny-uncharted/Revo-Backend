import { Module, CacheModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as redisStore from 'cache-manager-redis-store';
import databaseConfig from './config/database.config';
import { LoggingModule } from './modules/logging/logging.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggingInterceptor } from './modules/logging/interceptors/logging.interceptor';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuthModule } from './modules/auth/auth.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BullModule } from '@nestjs/bullmq';
import { Order } from './modules/orders/entities/order.entity';
import { BackupModule } from './database/backup/backup.module';


@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: 'localhost',
        port: 6379,
      },
    }),

    EventEmitterModule.forRoot(),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 10,
        },
      ],
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ...configService.get('database'),
      }),
    }),
     CacheModule.registerAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get('REDIS_HOST') || 'localhost',
        port: configService.get('REDIS_PORT') || 6379,
        ttl: 600, 
      }),
    }),

    LoggingModule,
    ProductsModule,
    OrdersModule,
    BackupModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    ProductsModule,
    OrdersModule,  
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },

    AuthModule
  ],
})
export class AppModule {}
