/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderRepository } from './repositories/order.repository';
import { OrderService } from './services/order.service';
import { OrderController } from './controllers/order.controller';

@Module({
  imports: [TypeOrmModule.forFeature([OrderRepository])],
  providers: [OrderService],
  controllers: [OrderController],
})
export class OrdersModule {}
