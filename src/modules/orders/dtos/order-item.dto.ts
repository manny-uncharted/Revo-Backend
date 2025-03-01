import { IsNotEmpty, IsNumber, IsUUID } from 'class-validator';

export class OrderItemDto {
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @IsNotEmpty()
  quantity: number;
}
