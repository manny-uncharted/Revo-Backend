import { Controller, Get, Query, ValidationPipe, BadRequestException } from '@nestjs/common';
import { SearchService } from '../services/search.service';
import { SearchDto } from '../dtos/search.dto';
import { FilterDto } from '../dtos/filter.dto';

@Controller('products')
export class ProductController {
  constructor(private readonly searchService: SearchService) {}

  @Get('search')
  async searchProducts(
    @Query('query') query?: string,
    @Query('sortBy') sortBy?: string,
    @Query('order') order?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('fields') fields?: string,
    @Query('category') category?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('brand') brand?: string,
  ) {
    try {
      // Ensure `order` is either "ASC" or "DESC" (default to "ASC")
      const validatedOrder: 'ASC' | 'DESC' = order === 'DESC' ? 'DESC' : 'ASC';

      // Create DTO instances manually
      const searchDto: SearchDto = { query, sortBy, order: validatedOrder, page, limit, fields };
      const filterDto: FilterDto = { category, minPrice, maxPrice, brand };

      // Validate that at least one search or filter parameter is provided
      if (!query && !category && !minPrice && !maxPrice && !brand) {
        throw new BadRequestException('At least one search or filter parameter is required.');
      }

      return this.searchService.searchProducts(searchDto, filterDto);
    } catch (error) {
      console.error('Error in searchProducts:', error);
      throw error;
    }
  }
}
