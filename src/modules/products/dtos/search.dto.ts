import { IsOptional, IsEnum, IsString, IsNumber, Min, Max } from "class-validator";

export class SearchDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsEnum(["ASC", "DESC"], { message: "Order must be 'ASC' or 'DESC'" })
  order?: "ASC" | "DESC";

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  fields?: string;
}
