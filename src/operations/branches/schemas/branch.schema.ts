import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type BranchDocument = HydratedDocument<Branch>;

// The canonical, org-wide list of physical work locations. Shift.jobSite and
// ChecklistTemplate.jobSite stay plain-text snapshots of a branch's name (not a reference to
// this collection) — same "snapshot not reference" pattern used elsewhere, so renaming or
// deleting a branch never corrupts historical shifts or checklist assignments.
@Schema({ timestamps: true })
export class Branch {
  @Prop({
    type: Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  organizationId: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 100 })
  name: string;

  @Prop({ required: true, min: -90, max: 90 })
  lat: number;

  @Prop({ required: true, min: -180, max: 180 })
  lng: number;

  // How close an employee's GPS position needs to be to count as "at the branch" for the
  // geofenced clock-in warning.
  @Prop({ required: true, min: 10, max: 5000, default: 100 })
  radiusMeters: number;
}

export const BranchSchema = SchemaFactory.createForClass(Branch);
