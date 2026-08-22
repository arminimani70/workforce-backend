import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PlatformAdminDocument = HydratedDocument<PlatformAdmin>;

// The SaaS operator, not scoped to any Organization — deliberately a separate collection (and
// a separate JWT secret/strategy, see platform-jwt.strategy.ts) so a leaked org-user token can
// never reach these routes and vice versa. There's normally exactly one of these, bootstrapped
// from PLATFORM_ADMIN_EMAIL/PLATFORM_ADMIN_PASSWORD on boot — see platform-admin.service.ts.
@Schema({ timestamps: true })
export class PlatformAdmin {
  @Prop({ required: true, trim: true, lowercase: true, unique: true })
  email: string;

  @Prop({ required: true, select: false })
  passwordHash: string;
}

export const PlatformAdminSchema = SchemaFactory.createForClass(PlatformAdmin);
