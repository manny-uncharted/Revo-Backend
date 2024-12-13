import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../../shared/entities/product.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product])],
  providers: [],
  controllers: [],
})
export class ProductsModule {}
