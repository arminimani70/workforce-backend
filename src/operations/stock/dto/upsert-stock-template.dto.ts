import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
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

  // Optional so existing callers/templates without par levels keep working — defaults to all
  // zeros (no delivery day set) at the schema level. Exactly 7 entries, index 0=Sunday.
  @IsOptional()
  @IsArray()
  @ArrayMinSize(7)
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(0, { each: true })
  parLevels?: number[];
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
