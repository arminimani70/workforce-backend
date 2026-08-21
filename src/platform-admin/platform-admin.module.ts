import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import {
  PlatformAdmin,
  PlatformAdminSchema,
} from './schemas/platform-admin.schema';
import { PlatformAdminService } from './platform-admin.service';
import { PlatformAdminController } from './platform-admin.controller';
import { PlatformJwtStrategy } from './strategies/platform-jwt.strategy';
import { OrganizationsModule } from '../organizations/organizations.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PlatformAdmin.name, schema: PlatformAdminSchema },
    ]),
    OrganizationsModule,
    UsersModule,
    PassportModule,
    JwtModule.register({}),
  ],
  controllers: [PlatformAdminController],
  providers: [PlatformAdminService, PlatformJwtStrategy],
})
export class PlatformAdminModule {}
