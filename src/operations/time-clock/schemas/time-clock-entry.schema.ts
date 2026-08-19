import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Position } from '../../../common/enums/position.enum';

export type TimeClockEntryDocument = HydratedDocument<TimeClockEntry>;

@Schema({ _id: false })
class GeoPoint {
  @Prop({ required: true })
  lat: number;

  @Prop({ required: true })
  lng: number;
}

@Schema({ timestamps: true })
export class TimeClockEntry {
  @Prop({
    type: Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  employeeId: Types.ObjectId;

  @Prop({ required: true })
  clockInTime: Date;

  // Absent while the entry is still open (employee hasn't clocked out yet).
  @Prop()
  clockOutTime?: Date;

  @Prop({ type: GeoPoint })
  clockInLocation?: GeoPoint;

  @Prop({ type: GeoPoint })
  clockOutLocation?: GeoPoint;

  // Left unset for now — Scheduling (Shift) module doesn't exist yet.
  @Prop({ type: Types.ObjectId, ref: 'Shift' })
  shiftId?: Types.ObjectId;

  // reason/jobSite/position are set only for a clock-in made without an approved shift
  // scheduled that day — TimeClockService requires all three in that case, since there's no
  // shift to infer the branch/position from otherwise.
  @Prop({ trim: true })
  reason?: string;

  @Prop({ trim: true })
  jobSite?: string;

  @Prop({ type: String, enum: Position })
  position?: Position;
}

export const TimeClockEntrySchema =
  SchemaFactory.createForClass(TimeClockEntry);

// An employee can only have one open (not-yet-clocked-out) entry at a time — enforced at the
// query layer in TimeClockService, this index just makes "find my open entry" fast.
TimeClockEntrySchema.index({
  organizationId: 1,
  employeeId: 1,
  clockOutTime: 1,
});
