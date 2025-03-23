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
