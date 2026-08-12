import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

export enum UserRole {
  OWNER = 'owner',
  MANAGER = 'manager',
  EMPLOYEE = 'employee',
}

export enum UserStatus {
  ACTIVE = 'active',
  INVITED = 'invited',
  SUSPENDED = 'suspended',
}

@Schema({ timestamps: true })
export class User {
  @Prop({
    type: Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  organizationId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop({ required: true, trim: true, lowercase: true })
  email: string;

  @Prop({ required: true, select: false })
  passwordHash: string;

  @Prop({ type: String, enum: UserRole, default: UserRole.EMPLOYEE })
  role: UserRole;

  // Self-editable profile fields. email and role are deliberately not here — those are set at
  // creation/by an owner-manager, not something the employee changes themselves.
  @Prop({ trim: true })
  phone?: string;

  // A data: URI (base64), not an external link — see UpdateProfileDto for the size/format cap.
  // Named avatarUrl (not avatarData) so the frontend can drop it straight into an <Image
  // source={{ uri }}> either way, regardless of how it's stored.
  @Prop()
  avatarUrl?: string;

  @Prop()
  birthDate?: Date;

  @Prop({ trim: true })
  address?: string;

  @Prop({ trim: true })
  emergencyContactName?: string;

  @Prop({ trim: true })
  emergencyContactPhone?: string;

  @Prop({ type: String, enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Globally unique so login (email + password, no tenant selection) can resolve the user directly.
UserSchema.index({ email: 1 }, { unique: true });
