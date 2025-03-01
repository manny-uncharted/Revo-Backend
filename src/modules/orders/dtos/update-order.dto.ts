import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { OrderItemDto } from './order-item.dto';
import { Type } from 'class-transformer';

export class UpdateOrderDto {
  @IsString()
  @IsOptional()
  stellarTransactionHash: string;

  @IsString()
  @IsOptional()
  stellarPublicKey?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  @IsOptional()
  items?: OrderItemDto[];

  @IsOptional()
  metadata?: Record<string, any>;
}
