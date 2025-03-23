import { Controller, Get, Query, ValidationPipe } from '@nestjs/common';
import { SearchService } from '../services/search.service';
import { SearchDto } from '../dtos/search.dto';
import { FilterDto } from '../dtos/filter.dto';

@Controller('products')
export class ProductController {
  constructor(private readonly searchService: SearchService) {}

  @Get('search')
  async searchProducts(
    @Query(new ValidationPipe({ transform: true })) searchDto: SearchDto,
    @Query(new ValidationPipe({ transform: true })) filterDto: FilterDto
  ) {
    return await this.searchService.searchProducts(searchDto, filterDto);
  }
}
