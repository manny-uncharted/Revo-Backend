/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderRepository } from './repositories/order.repository';
import { OrderService } from './services/order.service';
import { OrderController } from './controllers/order.controller';
import { OrderItem } from './entities/order-item.entity';
import { ProductsModule } from '../products/products.module';
import { Payment } from './entities/payment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OrderRepository, OrderItem, Payment]), ProductsModule],
  providers: [OrderService],
  controllers: [OrderController],
})
export class OrdersModule {}
