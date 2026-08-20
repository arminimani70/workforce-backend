import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class OrderQuantityDto {
  @IsString()
  @IsNotEmpty()
  productName: string;

  // Decimal allowed, deliberately — see OrderListEntryValue.
  @IsNumber()
  @Min(0)
  quantity: number;
}

export class SubmitOrderListDto {
  @IsMongoId()
  orderListTemplateId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => OrderQuantityDto)
  quantities: OrderQuantityDto[];
}
