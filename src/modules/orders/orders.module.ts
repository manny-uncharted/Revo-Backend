/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderRepository } from './repositories/order.repository';
import { OrderService } from './services/order.service';
import { OrderController } from './controllers/order.controller';
import { OrderItem } from './entities/order-item.entity';
import { ProductsModule } from '../products/products.module';
import { StatusService } from './services/status.service';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { OrderStatusUpdateListener } from './listeners/order-status-update.listener';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderRepository, OrderItem]),
    ProductsModule,
    EventEmitterModule.forRoot(),
  ],
  providers: [OrderService, StatusService, OrderStatusUpdateListener],
  controllers: [OrderController],
})
export class OrdersModule {}