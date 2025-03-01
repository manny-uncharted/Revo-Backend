import { Product } from 'src/modules/products/entities/product.entity';
import { BaseEntity } from 'src/shared/entities/base.entity';
import { Entity, Column, ManyToOne } from 'typeorm';
import { Order } from './order.entity';

@Entity('order_items')
export class OrderItem extends BaseEntity {
  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  order: Order;

  @Column({ nullable: false })
  productId: string;

  @Column({ type: 'int', nullable: false })
  quantity: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: false })
  pricePerUnit: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: false })
  totalPrice: number;

  @ManyToOne(() => Product, { nullable: false })
  productSnapshot: Product;
}
