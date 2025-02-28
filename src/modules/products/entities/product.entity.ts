import { BaseEntity } from '../../../shared/entities/base.entity';
import { Entity, Column, DeleteDateColumn } from 'typeorm';

@Entity('products')
export class Product extends BaseEntity {
  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  price: number;

  @Column()
  unit: string;

  @Column('json', { nullable: true })
  images: string[];

  @Column()
  stockQuantity: number;

  @Column({ type: 'timestamp' })
  harvestDate: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date;
}
