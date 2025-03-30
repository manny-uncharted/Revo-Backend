
import { 
  Controller, 
  Get, 
  Query, 
  ValidationPipe, 
  BadRequestException, 
  UseInterceptors, 
  CacheKey, 
  CacheTTL, 
  Logger 
} from "@nestjs/common";
import { CacheInterceptor } from "@nestjs/cache-manager";
import { SearchService } from "../services/search.service";
import { CombinedSearchFilterDto } from "../dtos/searchFilter.dto";
import { SearchDto } from "../dtos/search.dto";
import { FilterDto } from "../dtos/filter.dto";

@Controller("products")
@UseInterceptors(CacheInterceptor)
export class SearchController {
  private readonly logger = new Logger(SearchController.name);

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
      this.logger.error("Error in searchProducts", error);
      throw error;
    }
  }

  private logSearchAnalytics(search?: SearchDto, filter?: FilterDto): void {
    const analyticsData = {
      timestamp: new Date().toISOString(),
      query: search?.query || null,
      filters: filter
        ? {
            category: filter.category || null,
            price: filter.minPrice || filter.maxPrice
              ? { min: filter.minPrice || null, max: filter.maxPrice || null }
              : null,
            brand: filter.brand || null,
          }
        : null,
    };

    this.logger.log(`SEARCH_ANALYTICS: ${JSON.stringify(analyticsData)}`);
  }
}
