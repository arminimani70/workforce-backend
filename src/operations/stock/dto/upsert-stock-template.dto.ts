import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class StockItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  productName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  unit: string;
}

export class UpsertStockTemplateDto {
  // Present only when editing an existing list; omitted when creating a new one.
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  jobSite: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => StockItemDto)
  items: StockItemDto[];
}
