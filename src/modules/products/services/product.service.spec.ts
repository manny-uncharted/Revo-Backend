import { UpdateResult } from 'typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../entities/product.entity';
import { ProductService } from './product.service';
import { CreateProductDTO } from '../dtos/create-product.dto';
import { UpdateProductDTO } from '../dtos/update-product.dto';
import {
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';

describe('ProductService', () => {
  let service: ProductService;
  let repository: Repository<Product>;

  const mockProduct = {
    id: '1',
    name: 'Test Product',
    description: 'Test Description',
    price: 100,
    unit: 'Test Unit',
    category: 'Test Category',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: getRepositoryToken(Product),
          useValue: {
            create: jest.fn().mockResolvedValue(mockProduct),
            save: jest.fn().mockResolvedValue(mockProduct),
            find: jest.fn().mockResolvedValue([mockProduct]),
            findOne: jest.fn().mockResolvedValue(mockProduct),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
            softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
          },
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    repository = module.get<Repository<Product>>(getRepositoryToken(Product));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
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

      const result = await service.create(createProductDTO);
      expect(repository.create).toHaveBeenCalledWith(createProductDTO);
      expect(repository.save).toHaveBeenCalled();
      expect(result).toEqual(mockProduct);
    });

    it('should throw an error if creation fails', async () => {
      jest.spyOn(repository, 'save').mockRejectedValueOnce(new Error());
      await expect(service.create({} as CreateProductDTO)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should return an array of products', async () => {
      const result = await service.findAll();
      expect(repository.find).toHaveBeenCalled();
      expect(result).toEqual([mockProduct]);
    });

    it('should throw an error if fetching fails', async () => {
      jest.spyOn(repository, 'find').mockRejectedValueOnce(new Error());
      await expect(service.findAll()).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findOne', () => {
    it('should return a product by ID', async () => {
      const result = await service.findOne('1');
      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException if product is not found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValueOnce(null);
      await expect(service.findOne('2')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a product', async () => {
      const updateProductDTO: UpdateProductDTO = { price: 200 };
      const result = await service.update('1', updateProductDTO);
      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(repository.save).toHaveBeenCalled();
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException if product is not found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValueOnce(null);
      await expect(service.update('2', {} as UpdateProductDTO)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw InternalServerErrorException if update fails', async () => {
      jest.spyOn(repository, 'save').mockRejectedValueOnce(new Error());
      await expect(service.update('1', {} as UpdateProductDTO)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('remove', () => {
    it('should soft delete a product', async () => {
      await service.remove('1');
      expect(repository.softDelete).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException if product is not found', async () => {
      const mockUpdateResult: UpdateResult = {
        affected: 0,
        raw: {},
        generatedMaps: [],
      };

      jest
        .spyOn(repository, 'softDelete')
        .mockResolvedValueOnce(mockUpdateResult);

      await expect(service.remove('2')).rejects.toThrow(NotFoundException);
    });

    it('should throw InternalServerErrorException if deletion fails', async () => {
      jest.spyOn(repository, 'softDelete').mockRejectedValueOnce(new Error());
      await expect(service.remove('1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
