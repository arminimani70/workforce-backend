import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

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

  // Set only for an emergency clock-in — one made without an approved shift scheduled that
  // day, where TimeClockService requires the employee to explain why.
  @Prop({ trim: true })
  reason?: string;
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
