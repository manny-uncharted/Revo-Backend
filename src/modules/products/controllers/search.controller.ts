import { 
  Controller, 
  Get, 
  Query, 
  ValidationPipe, 
  BadRequestException, 
  UseInterceptors, 
  CacheKey, 
  CacheTTL 
} from "@nestjs/common";
import { CacheInterceptor } from "@nestjs/cache-manager";
import { SearchService } from "../services/search.service";
import { CombinedSearchFilterDto } from "../dtos/combined-search-filter.dto";

@Controller("products")
@UseInterceptors(CacheInterceptor) 
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get("search")
  @CacheKey("search_products") 
  @CacheTTL(600) 
  async searchProducts(
    @Query(new ValidationPipe({ 
      transform: true, 
      whitelist: true, 
      forbidNonWhitelisted: true, 
      forbidNullForNestedObjects: true, 
      skipMissingProperties: false 
    })) queryParams: CombinedSearchFilterDto
  ) {
    try {
      // Ensure at least one valid parameter is provided
      const { query, category, minPrice, maxPrice, brand } = queryParams;
      if (!query && !category && !minPrice && !maxPrice && !brand) {
        throw new BadRequestException("At least one search or filter parameter is required.");
      }

      return this.searchService.searchProducts(queryParams);
    } catch (error) {
      console.error("Error in searchProducts:", error);
      throw error;
    }
  }
}
