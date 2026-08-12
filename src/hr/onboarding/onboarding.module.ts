import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  OnboardingGuide,
  OnboardingGuideSchema,
} from './schemas/onboarding-guide.schema';
import { OnboardingService } from './onboarding.service';
import { OnboardingController } from './onboarding.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OnboardingGuide.name, schema: OnboardingGuideSchema },
    ]),
  ],
  controllers: [OnboardingController],
  providers: [OnboardingService],
})
export class OnboardingModule {}
