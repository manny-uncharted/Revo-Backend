import { IsOptional, IsString, IsNumber, Min, Max, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @ValidateIf((o) => o.minPrice !== undefined) 
  maxPrice?: number;

  @IsOptional()
  @IsString()
  brand?: string;
}
