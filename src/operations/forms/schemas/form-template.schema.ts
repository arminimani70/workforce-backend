import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type FormTemplateDocument = HydratedDocument<FormTemplate>;

export enum FormFieldType {
  TEXT = 'text',
  NUMBER = 'number',
}

@Schema({ _id: false })
class FormField {
  @Prop({ required: true, maxlength: 100 })
  label: string;

  @Prop({ type: String, enum: FormFieldType, required: true })
  type: FormFieldType;
}

// An org-wide catalog of report types (e.g. "Damaged Product", "Equipment Malfunction",
// "Urgent Supply Request") — unlike checklists these aren't tied to a position or branch;
// anyone can submit any of them, whenever something needs reporting.
@Schema({ timestamps: true })
export class FormTemplate {
  @Prop({
    type: Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  organizationId: Types.ObjectId;

  @Prop({ required: true, maxlength: 100 })
  title: string;

  @Prop({ type: [FormField], default: [] })
  fields: FormField[];
}

export const FormTemplateSchema = SchemaFactory.createForClass(FormTemplate);
