import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Position } from '../../../common/enums/position.enum';

export type ChecklistTemplateDocument = HydratedDocument<ChecklistTemplate>;

export { Position };

// One template per (position, branch) — what someone working that position at that branch
// should do at the start and end of their shift. jobSite is free text, matching Shift.jobSite
// (there's no Branch entity in the backend).
@Schema({ timestamps: true })
export class ChecklistTemplate {
  @Prop({
    type: Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  organizationId: Types.ObjectId;

  @Prop({ type: String, enum: Position, required: true })
  position: Position;

  @Prop({ required: true, maxlength: 100 })
  jobSite: string;

  @Prop({ type: [String], default: [] })
  openingItems: string[];

  @Prop({ type: [String], default: [] })
  closingItems: string[];
}

export const ChecklistTemplateSchema =
  SchemaFactory.createForClass(ChecklistTemplate);

// One template per position+branch combination.
ChecklistTemplateSchema.index(
  { organizationId: 1, position: 1, jobSite: 1 },
  { unique: true },
);
