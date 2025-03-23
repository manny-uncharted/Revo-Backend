import { BaseEntity } from 'src/shared/entities/base.entity';
import { Column, DeleteDateColumn, Entity, OneToMany } from 'typeorm';
import { Product } from './product.entity';

@Entity('categories')
export class Category extends BaseEntity {
  @Column()
  name: string;

  @OneToMany(() => Product, (product) => product.category)
  products: Product[];

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date;
}
