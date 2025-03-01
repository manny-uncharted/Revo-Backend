import { BaseEntity } from 'src/shared/entities/base.entity';
import { Entity, Column, OneToMany, DeleteDateColumn } from 'typeorm';
import { OrderItem } from './order-item.entity';

export enum OrderStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELED = 'canceled',
}

@Entity('orders')
export class Order extends BaseEntity {
  @Column({ type: 'int', nullable: false })
  userId: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: false })
  totalAmount: number;

  @Column({ default: OrderStatus.PENDING, nullable: false })
  status: OrderStatus;

  @Column({ type: 'varchar', length: 255, nullable: false })
  stellarTransactionHash: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  stellarPublicKey: string;

  @Column({ type: 'timestamp', nullable: false })
  paymentDeadline: Date;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order, { cascade: true })
  items: OrderItem[];

  @Column('json', { nullable: true })
  metadata: Record<string, any>;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date;
}
