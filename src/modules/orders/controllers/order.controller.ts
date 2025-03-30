/* eslint-disable prettier/prettier */
import {
  Body,
  Controller,
  InternalServerErrorException,
  Post,
  Get,
  Delete,
  Put,
  NotFoundException,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ParseDatePipe } from '../pipes/parse-date.pipe';
import { CreateOrderDto } from '../dtos/create-order.dto';
import { OrderService } from '../services/order.service';
import { UpdateOrderDto } from '../dtos/update-order.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  async create(@Body() createOrderDto: CreateOrderDto) {
    try {
      return this.orderService.create(createOrderDto);
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw new InternalServerErrorException(error.message);
      }
      throw error;
    }
  }

  @Get()
  async findAll() {
    try {
      return await this.orderService.findAll();
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw new InternalServerErrorException(error.message);
      }
      throw error;
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      return await this.orderService.findOne(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  @Patch('cancel/:id')
  async cancel(@Param('id') id: string) {
    try {
      return await this.orderService.cancel(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      }
      throw new InternalServerErrorException('Failed to cancel order');
    }
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateOrderDto,
  ) {
    try {
      return await this.orderService.update(id, updateOrderDto);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      }
      throw new InternalServerErrorException('Failed to update order');
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      return await this.orderService.remove(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      }
      throw new InternalServerErrorException('Failed to delete order');
    }
  }


  @Get('/reports/sales')
  @UseGuards(JwtAuthGuard)
  async getSalesReport(
    @Query('startDate', new ParseDatePipe()) startDate: Date,
    @Query('endDate', new ParseDatePipe()) endDate: Date,
  ) {
    try {
      return this.orderService.getSalesReport(
        startDate.toISOString(),
        endDate.toISOString(),
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      }
      throw new InternalServerErrorException('Failed to generate sales report');
    }
  }

  @Get('/reports/metrics')
  @UseGuards(JwtAuthGuard)
  async getOrderMetrics(
    @Query('startDate', new ParseDatePipe()) startDate: Date,
    @Query('endDate', new ParseDatePipe()) endDate: Date,
  ) {
    try {
      return this.orderService.getOrderMetrics(
        startDate.toISOString(),
        endDate.toISOString(),
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      }
      throw new InternalServerErrorException(
        'Failed to retrieve order metrics',
      );
    }
  }

}
