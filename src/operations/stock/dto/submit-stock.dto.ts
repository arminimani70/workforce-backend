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

export class StockQuantityDto {
  @IsString()
  @IsNotEmpty()
  productName: string;

  @IsNumber()
  @Min(0)
  quantity: number;
}

export class SubmitStockDto {
  @IsMongoId()
  stockTemplateId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => StockQuantityDto)
  quantities: StockQuantityDto[];
}
