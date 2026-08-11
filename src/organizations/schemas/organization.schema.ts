import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type OrganizationDocument = HydratedDocument<Organization>;

@Schema({ timestamps: true })
export class Organization {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  industry?: string;

  // Set right after the owner User is created (registration creates Org then User then links this back).
  @Prop({ type: Types.ObjectId, ref: 'User' })
  ownerId?: Types.ObjectId;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);
