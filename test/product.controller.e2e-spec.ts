import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { CreateProductDTO } from '../src/modules/products/dtos/create-product.dto';
import { UpdateProductDTO } from '../src/modules/products/dtos/update-product.dto';
import { ProductsModule } from '../src/modules/products/products.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../src/modules/products/entities/product.entity';

describe('ProductController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.POSTGRES_HOST || 'localhost',
          port: parseInt(process.env.POSTGRES_PORT, 10) || 5432,
          username: process.env.POSTGRES_USER || 'myuser',
          password: process.env.POSTGRES_PASSWORD || 'mypassword',
          database: process.env.POSTGRES_DB || 'mydatabase',
          entities: [Product],
          synchronize: true,
        }),
        ProductsModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/products (POST)', () => {
    it('should create a product', async () => {
      const createProductDTO: CreateProductDTO = {
        name: 'Test Product',
        description: 'This is a test product',
        price: 100.0,
        unit: 'kg',
        images: ['image1.jpg', 'image2.jpg'],
        stockQuantity: 10,
        harvestDate: new Date('2025-03-10'),
      };

      const response = await request(app.getHttpServer())
        .post('/products')
        .send(createProductDTO)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toEqual(createProductDTO.name);
      expect(response.body.description).toEqual(createProductDTO.description);
      expect(response.body.price).toEqual(createProductDTO.price);
      expect(response.body.unit).toEqual(createProductDTO.unit);
      expect(response.body.stockQuantity).toEqual(
        createProductDTO.stockQuantity,
      );
    });

    it('should return 400 if required fields are missing', async () => {
      const createProductDTO = {
        description: 'Test Description',
        price: 100,
      };

      await request(app.getHttpServer())
        .post('/products')
        .send(createProductDTO)
        .expect(400);
    });
  });

  describe('/products (GET)', () => {
    it('should return an array of products', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('/products/:id (GET)', () => {
    it('should return a product by ID', async () => {
      const createProductDTO: CreateProductDTO = {
        name: 'Test Product',
        description: 'This is a test product',
        price: 100.0,
        unit: 'kg',
        images: ['image1.jpg', 'image2.jpg'],
        stockQuantity: 10,
        harvestDate: new Date('2025-03-10'),
      };

      const createResponse = await request(app.getHttpServer())
        .post('/products')
        .send(createProductDTO);

      const productId = createResponse.body.id;

      const response = await request(app.getHttpServer())
        .get(`/products/${productId}`)
        .expect(200);

      expect(response.body.id).toEqual(productId);
      expect(response.body.name).toEqual(createProductDTO.name);
    });

    it('should return 404 if product is not found', async () => {
      await request(app.getHttpServer()).get('/products/550e8400-e29b-41d4-a716-446655440000').expect(404);
    });
  });

  describe('/products/:id (PUT)', () => {
    it('should update a product', async () => {
      const createProductDTO: CreateProductDTO = {
        name: 'Test Product',
        description: 'This is a test product',
        price: 100.0,
        unit: 'kg',
        images: ['image1.jpg', 'image2.jpg'],
        stockQuantity: 10,
        harvestDate: new Date('2025-03-10'),
      };

      const createResponse = await request(app.getHttpServer())
        .post('/products')
        .send(createProductDTO);

      const productId = createResponse.body.id;

      const updateProductDTO: UpdateProductDTO = {
        price: 200,
      };

      const response = await request(app.getHttpServer())
        .put(`/products/${productId}`)
        .send(updateProductDTO)
        .expect(200);

      expect(response.body.price).toEqual(updateProductDTO.price);
    });

    it('should return 404 if product is not found', async () => {
      const updateProductDTO: UpdateProductDTO = {
        price: 200,
      };

      await request(app.getHttpServer())
        .put('/products/550e8400-e29b-41d4-a716-446655440000')
        .send(updateProductDTO)
        .expect(404);
    });
  });

  describe('/products/:id (DELETE)', () => {
    it('should delete a product', async () => {
      const createProductDTO: CreateProductDTO = {
        name: 'Test Product',
        description: 'This is a test product',
        price: 100.0,
        unit: 'kg',
        images: ['image1.jpg', 'image2.jpg'],
        stockQuantity: 10,
        harvestDate: new Date('2025-03-10'),
      };

      const createResponse = await request(app.getHttpServer())
        .post('/products')
        .send(createProductDTO);

      const productId = createResponse.body.id;

      await request(app.getHttpServer())
        .delete(`/products/${productId}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/products/${productId}`)
        .expect(404);
    });

    it('should return 404 if product is not found', async () => {
      await request(app.getHttpServer()).delete('/products/550e8400-e29b-41d4-a716-446655440000').expect(404);
    });
  });
});
