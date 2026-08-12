import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  OnboardingGuide,
  OnboardingGuideDocument,
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
      return { organizationId, content: '', updatedAt: null };
    }
    return existing;
  }

  update(organizationId: string, userId: string, content: string) {
    return this.guideModel.findOneAndUpdate(
      { organizationId },
      { organizationId, content, updatedBy: userId },
      { upsert: true, new: true },
    );
  }
}
