import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { PlansService } from './plans.service';
import { Plan, PlanSchema } from './schemas/plan.schema';
import { OrganizationsModule } from '../organizations/organizations.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Plan.name, schema: PlanSchema }]),
    OrganizationsModule,
    UsersModule,
  ],
  controllers: [BillingController],
  providers: [BillingService, PlansService],
  exports: [PlansService],
})
export class BillingModule {}
