import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../../modules/products/entities/product.entity';
import { ProductController } from './controllers/product.controller';
import { ProductService } from './services/product.service';
import { MediaController } from './controllers/ media.controller';
import { MediaService } from './services/media.service';
import { ProductImage } from './entities/product-image.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductImage])],
  providers: [ProductService, MediaService],
  controllers: [ProductController, MediaController],
  exports: [ProductService, MediaService],
})
export class ProductsModule {}
