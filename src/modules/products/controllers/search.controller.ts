import { Controller, Get, Query, ValidationPipe, BadRequestException } from "@nestjs/common";
import { SearchService } from "../services/search.service";
import { CombinedSearchFilterDto } from "../dtos/searchFilter.dto";

@Controller("products")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get("search")
  async searchProducts(
    @Query(new ValidationPipe({ transform: true, whitelist: true })) queryParams: CombinedSearchFilterDto
  ) {
    try {
      const { search, filter } = queryParams;

      // Ensure at least one valid parameter is provided
      if (!search?.query && !filter?.category && !filter?.minPrice && !filter?.maxPrice && !filter?.brand) {
        throw new BadRequestException("At least one search or filter parameter is required.");
      }

      return this.searchService.searchProducts(search, filter);
    } catch (error) {
      console.error("Error in searchProducts:", error);
      throw error;
    }
  }
}
