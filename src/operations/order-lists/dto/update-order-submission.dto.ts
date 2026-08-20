import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { OrderQuantityDto } from './submit-order-list.dto';

// Owner/manager correcting a submitted order — productName/unit stay fixed (they're a snapshot
// of the template at submit time), only the quantities themselves are editable.
export class UpdateOrderSubmissionDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => OrderQuantityDto)
  quantities: OrderQuantityDto[];
}
