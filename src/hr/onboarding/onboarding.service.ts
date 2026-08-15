import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  OnboardingGuide,
  OnboardingGuideDocument,
  OnboardingSection,
} from './schemas/onboarding-guide.schema';

@Injectable()
export class OnboardingService {
  constructor(
    @InjectModel(OnboardingGuide.name)
    private readonly guideModel: Model<OnboardingGuideDocument>,
  ) {}

  async getForOrg(organizationId: string) {
    const existing = await this.guideModel.findOne({ organizationId }).lean();
    if (!existing) {
      return { organizationId, sections: [], updatedAt: null };
    }
    return existing;
  }

  update(
    organizationId: string,
    userId: string,
    sections: OnboardingSection[],
  ) {
    return this.guideModel.findOneAndUpdate(
      { organizationId },
      { organizationId, sections, updatedBy: userId },
      { upsert: true, new: true },
    );
  }
}
