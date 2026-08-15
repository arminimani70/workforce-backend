import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { FormFieldType } from '../schemas/form-template.schema';

export class FormFieldDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  label: string;

  @IsEnum(FormFieldType)
  type: FormFieldType;
}

export class UpsertFormTemplateDto {
  // Present only when editing an existing template; omitted when creating a new one.
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => FormFieldDto)
  fields: FormFieldDto[];
}
