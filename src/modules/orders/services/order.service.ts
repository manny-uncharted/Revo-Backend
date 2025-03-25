import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../entities/order.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateOrderDto } from '../dtos/create-order.dto';
import { UpdateOrderDto } from '../dtos/update-order.dto';
import { OrderItem } from '../entities/order-item.entity';
import { ProductService } from 'src/modules/products/services/product.service';
import { OrderStatusUpdatedEvent } from '../events/status-update.event';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    private readonly productService: ProductService,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    const orderItems: OrderItem[] = [];
    let totalAmount = 0;

    for (const item of createOrderDto.items) {
      const product = await this.productService.findOne(item.productId);
      if (!product) {
        throw new NotFoundException(
          `Product with ID ${item.productId} not found`,
        );
      }
      if (product.stockQuantity < item.quantity) {
        throw new InternalServerErrorException(
          `Product with ID ${item.productId} has only ${product.stockQuantity} items in stock`,
        );
      }

      const totalPrice = product.price * item.quantity;
      totalAmount += totalPrice;

      const orderItem = this.orderItemRepository.create({
        productId: product.id,
        quantity: item.quantity,
        pricePerUnit: product.price,
        totalPrice: totalPrice,
        productSnapshot: product,
      });

      orderItems.push(orderItem);
    }

    const order = this.orderRepository.create({
      ...createOrderDto,
      totalAmount: totalAmount,
      paymentDeadline: new Date(Date.now() + 5 * 60 * 1000),
      items: orderItems,
      status: OrderStatus.PENDING,
    });

    const savedOrder = await this.orderRepository.save(order);
    this.eventEmitter.emit(
      'order.status.updated',
      new OrderStatusUpdatedEvent(savedOrder.id, null, OrderStatus.PENDING),
    );
    return savedOrder;
  }
  async cancel(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    const previousStatus = order.status;
    order.status = OrderStatus.CANCELED;
    const updatedOrder = await this.orderRepository.save(order);
    this.eventEmitter.emit(
      'order.status.updated',
      new OrderStatusUpdatedEvent(updatedOrder.id, previousStatus, OrderStatus.CANCELED),
    );
    return updatedOrder;
  }
  async update(id: string, updateOrderDto: UpdateOrderDto): Promise<Order> {

      const order = await this.orderRepository.findOne({
        where: { id },
        relations: { items: true },
      });

      if (!order) {
        throw new NotFoundException(`Order with ID ${id} not found`);
      }

      const previousStatus = order.status;

      if (updateOrderDto.stellarPublicKey !== undefined) {
        order.stellarPublicKey = updateOrderDto.stellarPublicKey;
      }
      if (updateOrderDto.stellarTransactionHash !== undefined) {
        order.stellarTransactionHash = updateOrderDto.stellarTransactionHash;
      }

      if (updateOrderDto.metadata !== undefined) {
        order.metadata = updateOrderDto.metadata;
      }

      if (updateOrderDto.items && updateOrderDto.items.length > 0) {
        const updatedItems: OrderItem[] = [];

        for (const itemDto of updateOrderDto.items) {
          const product = await this.productService.findOne(itemDto.productId);
          if (!product) {
            throw new NotFoundException(
              `Product with ID ${itemDto.productId} not found`,
            );
          }
          if (product.stockQuantity < itemDto.quantity) {
            throw new InternalServerErrorException(
              `Product with ID ${itemDto.productId} has only ${product.stockQuantity} items in stock`,
            );
          }

          const totalPrice = product.price * itemDto.quantity;

          const orderItem = this.orderItemRepository.create({
            productId: product.id,
            quantity: itemDto.quantity,
            pricePerUnit: product.price,
            totalPrice: totalPrice,
            productSnapshot: product,
            order,
          });

          updatedItems.push(orderItem);
        }

        await this.orderItemRepository.remove(order.items);
        await this.orderItemRepository.save(updatedItems);

        order.items = updatedItems;

        order.totalAmount = updatedItems.reduce(
          (sum, item) => sum + item.totalPrice,
          0,
        );
      }
      const updatedOrder =  await this.orderRepository.save(order);
        if (updatedOrder.status !== previousStatus) {
            this.eventEmitter.emit(
              'order.status.updated',
              new OrderStatusUpdatedEvent(updatedOrder.id, previousStatus, updatedOrder.status)
            );
        }
        return updatedOrder;
  }
   async findOne(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({ where: { id }, relations: {items: true} });
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return order;
  }
    async findAll(): Promise<Order[]> {
    try {
      return await this.orderRepository.find({
        relations: {
          items: true,
        },
      });
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch orders');
    }
  }
  async remove(id: string): Promise<void> {
    try {
      const order = await this.findOne(id);

      await this.orderItemRepository.delete({ order: order });
      await this.orderRepository.softDelete(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.log(error);
      throw new InternalServerErrorException('Failed to delete order');
    }
  }
}