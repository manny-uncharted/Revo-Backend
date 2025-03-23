import { Controller, Get, Query, ValidationPipe, BadRequestException } from "@nestjs/common";
import { SearchService } from "../services/search.service";
import { SearchDto } from "../dtos/search.dto";
import { FilterDto } from "../dtos/filter.dto";

@Controller("products")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get("search")
  async searchProducts(
    @Query(new ValidationPipe({ transform: true })) searchDto: SearchDto,
    @Query(new ValidationPipe({ transform: true })) filterDto: FilterDto
  ) {
    try {
      // Validate that at least one search or filter parameter is provided
      if (!searchDto.query && !filterDto.category && !filterDto.minPrice && !filterDto.maxPrice && !filterDto.brand) {
        throw new BadRequestException("At least one search or filter parameter is required.");
      }

      return this.searchService.searchProducts(searchDto, filterDto);
    } catch (error) {
      console.error("Error in searchProducts:", error);
      throw error;
    }
  }
}
