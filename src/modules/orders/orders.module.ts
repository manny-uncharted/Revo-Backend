import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderService } from './services/order.service';
import { OrderController } from './controllers/order.controller';
import { OrderItem } from './entities/order-item.entity';
import { ProductsModule } from '../products/products.module';
import { BullModule } from '@nestjs/bullmq';
import { NotificationService } from './services/notification.services';
import { WebhookController} from './controllers/webhook.controller';
import { NotificationLogListener } from './events/notification-log.listener';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem]), ProductsModule,  BullModule.registerQueue(
    {
      name:'notification'
    }
  )],
  providers: [OrderService, NotificationService, NotificationLogListener],
  controllers: [OrderController, WebhookController],
})
export class OrdersModule {}
