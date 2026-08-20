import { Injectable, Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  OnboardingGuide,
  OnboardingGuideSchema,
} from './schemas/onboarding-guide.schema';
import {
  OnboardingResource,
  OnboardingResourceSchema,
} from './schemas/onboarding-resource.schema';
import { OnboardingService } from './onboarding.service';
import { OnboardingController } from './onboarding.controller';
import { ensureOnboardingUploadsDir } from './onboarding-upload.config';

@Injectable()
class OnboardingUploadsDirInit implements OnModuleInit {
  onModuleInit() {
    ensureOnboardingUploadsDir();
  }
}

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OnboardingGuide.name, schema: OnboardingGuideSchema },
      { name: OnboardingResource.name, schema: OnboardingResourceSchema },
    ]),
  ],
  controllers: [OnboardingController],
  providers: [OnboardingService, OnboardingUploadsDirInit],
})
export class OnboardingModule {}
