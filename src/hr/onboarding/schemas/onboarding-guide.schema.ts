import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type OnboardingGuideDocument = HydratedDocument<OnboardingGuide>;

// One guide per organization — owner/manager write it, every member reads it. Unlike
// Availability/Shift/Task, this has no per-employee dimension, so organizationId alone is
// the lookup key (and is unique, since there's only ever one guide per org).
@Schema({ timestamps: true })
export class OnboardingGuide {
  @Prop({
    type: Types.ObjectId,
    ref: 'Organization',
    required: true,
    unique: true,
    index: true,
  })
  organizationId: Types.ObjectId;

  @Prop({ default: '', trim: true })
  content: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;
}

export const OnboardingGuideSchema =
  SchemaFactory.createForClass(OnboardingGuide);
