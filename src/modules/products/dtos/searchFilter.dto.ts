import { SearchDto } from "./search.dto";
import { FilterDto } from "./filter.dto";
import { IsOptional, ValidateNested, Type } from "class-validator";

export class CombinedSearchFilterDto {
  @ValidateNested()
  @Type(() => SearchDto)
  @IsOptional()
  search?: SearchDto;

  @ValidateNested()
  @Type(() => FilterDto)
  @IsOptional()
  filter?: FilterDto;
}
