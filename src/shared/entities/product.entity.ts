import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';

@Entity('products')
export class Product extends BaseEntity {
  @Column()
  name: string;

  @Column('text')
  description: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column()
  unit: string;

  @Column('json', { nullable: true })
  images: string[];

  @Column()
  stockQuantity: number;

  @Column({ type: 'timestamp' })
  harvestDate: Date;
}
