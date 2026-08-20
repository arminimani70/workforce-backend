import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type OnboardingResourceDocument = HydratedDocument<OnboardingResource>;

// A training material a manager attached to onboarding (PDF, Word doc, slide deck, image, ...).
// The file itself lives on local disk under UPLOADS_DIR — storedFileName is its name there
// (a random name, so it never collides and never leaks the original filename in a URL/path).
// This document is just the metadata every member needs to list and download it.
@Schema({ timestamps: true })
export class OnboardingResource {
  @Prop({
    type: Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  organizationId: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 200 })
  title: string;

  @Prop({ required: true })
  fileName: string;

  @Prop({ required: true })
  storedFileName: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  size: number;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  uploadedBy: Types.ObjectId;
}

export const OnboardingResourceSchema =
  SchemaFactory.createForClass(OnboardingResource);
