/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import databaseConfig from './config/database.config';
import { LoggingModule } from './modules/logging/logging.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggingInterceptor } from './modules/logging/interceptors/logging.interceptor';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { AuthModule } from './modules/auth/auth.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BullModule } from '@nestjs/bullmq';
import { Order } from './modules/orders/entities/order.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ...configService.get('database'),
        entities: [Order],
        synchronize: process.env.NODE_ENV !== 'production',
      }),
    }),
    LoggingModule,
    ProductsModule,
    OrdersModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD', undefined),
          tls: configService.get('REDIS_TLS_ENABLED', false)
            ? {
                rejectUnauthorized: configService.get(
                  'REDIS_REJECT_UNAUTHORIZED',
                  true,
                ),
              }
            : undefined,
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'exportQueue',
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    ProductsModule,
    OrdersModule,
    AuthModule
  ],
})
export class AppModule {}