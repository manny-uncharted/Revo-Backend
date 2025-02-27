import { IsString, IsNumber, IsOptional, IsArray, IsDate } from 'class-validator';

export class UpdateProductDTO {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  price?: number;
  
  @IsString()
  @IsOptional()
  unit?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsNumber()
  @IsOptional()
  stockQuantity?: number;

  @IsDate()
  @IsOptional()
  harvestDate?: Date;
}