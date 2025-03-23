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
import { CombinedSearchFilterDto } from "../dtos/searchFilter.dto";

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
      skipMissingProperties: false
    })) queryParams: CombinedSearchFilterDto
  ) {
    try {
      const { search, filter } = queryParams;
      
     
      this.logSearchAnalytics(search, filter);

      if (!search?.query && !filter?.category && !filter?.minPrice && !filter?.maxPrice && !filter?.brand) {
        throw new BadRequestException("At least one search or filter parameter is required.");
      }

      return this.searchService.searchProducts(search, filter);
    } catch (error) {
      console.error("Error in searchProducts:", error);
      throw error;
    }
  }

 
  private logSearchAnalytics(search?: any, filter?: any): void {
    const analyticsData = {
      timestamp: new Date().toISOString(),
      query: search?.query || null,
      filters: filter ? {
        category: filter.category || null,
        price: filter.minPrice || filter.maxPrice 
          ? { min: filter.minPrice || null, max: filter.maxPrice || null } 
          : null,
        brand: filter.brand || null
      } : null,
      
    };
    

    console.log('SEARCH_ANALYTICS:', JSON.stringify(analyticsData));
  }
}
