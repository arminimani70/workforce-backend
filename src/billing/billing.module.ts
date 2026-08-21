import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { OrganizationsModule } from '../organizations/organizations.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [OrganizationsModule, UsersModule],
  controllers: [BillingController],
  providers: [BillingService],
})
export class BillingModule {}
