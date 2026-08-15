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
import { TasksModule } from './operations/tasks/tasks.module';
import { OnboardingModule } from './hr/onboarding/onboarding.module';
import { ChatModule } from './communication/chat/chat.module';
import { ChecklistsModule } from './operations/checklists/checklists.module';
import { FormsModule } from './operations/forms/forms.module';

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
    TasksModule,
    OnboardingModule,
    ChatModule,
    ChecklistsModule,
    FormsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
