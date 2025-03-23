import { IsOptional, IsString, IsNumber, Min, ValidateIf } from 'class-validator';
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
  @ValidateIf((o, value) => o.minPrice === undefined || value >= o.minPrice, {
    message: 'maximum Price must be greater than or equal to minimum Price',
  })
  maxPrice?: number;

  @IsOptional()
  @IsString()
  brand?: string;
}
