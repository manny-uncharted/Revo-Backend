import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class SearchDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.toUpperCase()) 
  order?: 'ASC' | 'DESC';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  fields?: string;

  constructor() {
    this.page = this.page ?? 1;
    this.limit = this.limit ?? 10;
  }
}
