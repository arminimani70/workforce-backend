import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { StockQuantityDto } from './submit-stock.dto';

// Owner/manager correcting a submitted stock count — productName/unit stay fixed (they're a
// snapshot of the template at submit time), only the quantities themselves are editable.
export class UpdateStockSubmissionDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => StockQuantityDto)
  quantities: StockQuantityDto[];
}
