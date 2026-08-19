import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Position } from '../../../common/enums/position.enum';

export type ChecklistTemplateDocument = HydratedDocument<ChecklistTemplate>;

export { Position };

// One template per (position, branch) — what someone working that position at that branch
// should do at the start and end of their shift. jobSite is free text, matching Shift.jobSite
// (there's no Branch entity in the backend). jobSite may be blank, meaning "every branch" for
// that position — many orgs don't bother naming branches on shifts at all, so a blank-jobSite
// template is what a shift with no jobSite of its own falls back to.
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

  @Prop({ maxlength: 100, default: '' })
  jobSite: string;

  // Shown as the checklist's heading instead of a generic "Opening/Closing Checklist" — lets a
  // branch's template read as, say, "Morning Opening — Front Desk" instead of being anonymous.
  @Prop({ maxlength: 150, default: '' })
  title: string;

  @Prop({ type: [String], default: [] })
  openingItems: string[];

  @Prop({ type: [String], default: [] })
  closingItems: string[];

  // Whether this checklist's items may carry a proof-of-completion photo. Off by default — a
  // manager opts a checklist into photos rather than every checklist growing camera buttons.
  @Prop({ default: false })
  allowPhoto: boolean;
}

export const ChecklistTemplateSchema =
  SchemaFactory.createForClass(ChecklistTemplate);

// One template per position+branch combination.
ChecklistTemplateSchema.index(
  { organizationId: 1, position: 1, jobSite: 1 },
  { unique: true },
);
