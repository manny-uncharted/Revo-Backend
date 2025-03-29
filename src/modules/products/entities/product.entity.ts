import { BaseEntity } from '../../../shared/entities/base.entity';
import { Entity, Column, DeleteDateColumn, Index } from 'typeorm';

@Entity('products')
export class Product extends BaseEntity {
  @Index() // Adding an index to speed up searches by name
  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  price: number;

  @Column()
  unit: string;

  @Column('simple-json', { nullable: true })
  images: string[];

  @Column()
  stockQuantity: number;

  @Column({ type: 'datetime' })
  @ManyToOne(() => Category, (category) => category.products, {
    nullable: false,
  })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Column()
  categoryId: string;

  @Column({ type: 'timestamp' })
  harvestDate: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date;
}
