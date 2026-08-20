import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type OnboardingGuideDocument = HydratedDocument<OnboardingGuide>;

@Schema({ _id: false })
export class OnboardingSection {
  @Prop({ required: true, maxlength: 200 })
  title: string;

  @Prop({ default: '', maxlength: 20000 })
  content: string;
}

export const OnboardingSectionSchema =
  SchemaFactory.createForClass(OnboardingSection);

// One guide per organization — owner/manager write it, every member reads it. Unlike
// Availability/Shift, this has no per-employee dimension, so organizationId alone is
// the lookup key (and is unique, since there's only ever one guide per org). A guide is a
// list of titled sections rather than one text blob, so it can be searched/browsed by title.
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

  @Prop({ type: [OnboardingSectionSchema], default: [] })
  sections: OnboardingSection[];

  // A flat list of short daily-conduct rules for new hires (e.g. "Clock in before your shift
  // starts") — plain strings rather than titled sections since these are meant to be skimmed as
  // a single checklist, not browsed/searched one at a time like sections are.
  @Prop({ type: [String], default: [] })
  rules: string[];

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;
}

export const OnboardingGuideSchema =
  SchemaFactory.createForClass(OnboardingGuide);
