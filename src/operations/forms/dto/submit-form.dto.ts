import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class FormFieldValueDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  label: string;

  @IsString()
  @MaxLength(1000)
  value: string;
}

export class SubmitFormDto {
  @IsMongoId()
  formTemplateId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => FormFieldValueDto)
  values: FormFieldValueDto[];
}
