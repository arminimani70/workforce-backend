import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { TimeClockModule } from './operations/time-clock/time-clock.module';
import { SchedulingModule } from './operations/scheduling/scheduling.module';
import { AvailabilityModule } from './operations/availability/availability.module';
import { OnboardingModule } from './hr/onboarding/onboarding.module';
import { ChatModule } from './communication/chat/chat.module';
import { ChecklistsModule } from './operations/checklists/checklists.module';
import { FormsModule } from './operations/forms/forms.module';
import { BranchesModule } from './operations/branches/branches.module';
import { StockModule } from './operations/stock/stock.module';
import { WastageModule } from './operations/wastage/wastage.module';
import { OrderListsModule } from './operations/order-lists/order-lists.module';
import { BillingModule } from './billing/billing.module';
import { PlatformAdminModule } from './platform-admin/platform-admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('MONGODB_URI'),
      }),
    }),
    AuthModule,
    UsersModule,
    OrganizationsModule,
    TimeClockModule,
    SchedulingModule,
    AvailabilityModule,
    OnboardingModule,
    ChatModule,
    ChecklistsModule,
    FormsModule,
    BranchesModule,
    StockModule,
    WastageModule,
    OrderListsModule,
    BillingModule,
    PlatformAdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
