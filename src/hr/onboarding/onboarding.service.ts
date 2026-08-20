import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { unlink } from 'fs/promises';
import { join } from 'path';
import {
  OnboardingGuide,
  OnboardingGuideDocument,
  OnboardingSection,
} from './schemas/onboarding-guide.schema';
import {
  OnboardingResource,
  OnboardingResourceDocument,
} from './schemas/onboarding-resource.schema';
import { ONBOARDING_UPLOADS_DIR } from './onboarding-upload.config';

@Injectable()
export class OnboardingService {
  constructor(
    @InjectModel(OnboardingGuide.name)
    private readonly guideModel: Model<OnboardingGuideDocument>,
    @InjectModel(OnboardingResource.name)
    private readonly resourceModel: Model<OnboardingResourceDocument>,
  ) {}

  async getForOrg(organizationId: string) {
    const existing = await this.guideModel.findOne({ organizationId }).lean();
    if (!existing) {
      return { organizationId, sections: [], rules: [], updatedAt: null };
    }
    // A document saved before the single-content-blob -> titled-sections migration won't have
    // a sections array yet — default it so callers never see undefined here. Same for rules,
    // added after both of those.
    return {
      ...existing,
      sections: existing.sections ?? [],
      rules: existing.rules ?? [],
    };
  }

  update(
    organizationId: string,
    userId: string,
    sections: OnboardingSection[],
    rules: string[],
  ) {
    return this.guideModel.findOneAndUpdate(
      { organizationId },
      { organizationId, sections, rules, updatedBy: userId },
      { upsert: true, new: true },
    );
  }

  // Org-wide, any authenticated member — the catalog of training material to browse/download.
  listResources(organizationId: string) {
    return this.resourceModel
      .find({ organizationId })
      .select('-storedFileName')
      .populate('uploadedBy', 'fullName role')
      .sort({ createdAt: -1 });
  }

  createResource(
    organizationId: string,
    uploadedBy: string,
    file: Express.Multer.File,
    title: string,
  ) {
    return this.resourceModel.create({
      organizationId,
      title: title?.trim() || file.originalname,
      fileName: file.originalname,
      storedFileName: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      uploadedBy,
    });
  }

  async getResourceForDownload(organizationId: string, id: string) {
    if (!isValidObjectId(id)) {
      throw new NotFoundException('Resource not found');
    }
    const resource = await this.resourceModel.findOne({
      _id: id,
      organizationId,
    });
    if (!resource) {
      throw new NotFoundException('Resource not found');
    }
    return resource;
  }

  async deleteResource(organizationId: string, id: string) {
    if (!isValidObjectId(id)) {
      throw new NotFoundException('Resource not found');
    }
    const deleted = await this.resourceModel.findOneAndDelete({
      _id: id,
      organizationId,
    });
    if (!deleted) {
      throw new NotFoundException('Resource not found');
    }
    // Best-effort: the metadata is already gone, so a stray file on disk isn't worth failing
    // the request over (it can't be reached through the API anymore either way).
    await unlink(join(ONBOARDING_UPLOADS_DIR, deleted.storedFileName)).catch(
      () => undefined,
    );
  }
}
