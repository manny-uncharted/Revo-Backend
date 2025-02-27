import { IsString, IsNumber, IsOptional, IsNotEmpty, IsDate, IsArray } from 'class-validator';

export class CreateProductDTO {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  price: number;

  @IsString()
  unit: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsNumber()
  stockQuantity: number;

  @IsDate()
  harvestDate: Date;

}