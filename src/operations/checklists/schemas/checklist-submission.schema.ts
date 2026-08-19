import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Position } from '../../../common/enums/position.enum';
import { ChecklistItemStatus } from './checklist-completion.schema';

export type ChecklistSubmissionDocument = HydratedDocument<ChecklistSubmission>;

export enum ChecklistSection {
  OPENING = 'opening',
  CLOSING = 'closing',
}

// An immutable snapshot of one section (opening or closing) at the moment someone submitted
// it — created every time ChecklistCompletion.submitSection runs, so the review history keeps
// every round even though the live sheet itself resets to blank right after. Not linked back to
// a specific ChecklistCompletion document since that gets reused indefinitely.
@Schema({ timestamps: true })
export class ChecklistSubmission {
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

  @Prop({ type: String, enum: ChecklistSection, required: true })
  section: ChecklistSection;

  @Prop({ type: [ChecklistItemStatus], default: [] })
  statuses: ChecklistItemStatus[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  submittedBy: Types.ObjectId;

  // A hand-drawn signature captured at submit time, confirming this round — stored as SVG path
  // data (one or more "M x y L x y ..." subpaths), not a raster image, since the app draws it
  // with react-native-svg on both capture and review rather than rasterizing to a PNG.
  @Prop({ required: true, maxlength: 20_000 })
  signature: string;

  // Proof-of-completion photos for the round as a whole, captured once at submit time rather
  // than per item — base64 data URIs like User.avatarUrl, capped at 8 since this is meant as a
  // quick "here's the finished state" batch, not a photo log of every single item.
  @Prop({ type: [String], default: [] })
  photos: string[];

  // Not @Prop-decorated — added by { timestamps: true }; declared so TS knows about it.
  createdAt: Date;
}

export const ChecklistSubmissionSchema =
  SchemaFactory.createForClass(ChecklistSubmission);

ChecklistSubmissionSchema.index({ organizationId: 1, createdAt: -1 });
