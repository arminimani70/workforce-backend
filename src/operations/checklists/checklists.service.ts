import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ChecklistTemplate,
  ChecklistTemplateDocument,
  Position,
} from './schemas/checklist-template.schema';
import {
  ChecklistCompletion,
  ChecklistCompletionDocument,
} from './schemas/checklist-completion.schema';
import {
  ChecklistSection,
  ChecklistSubmission,
  ChecklistSubmissionDocument,
} from './schemas/checklist-submission.schema';
import { UpsertChecklistTemplateDto } from './dto/upsert-checklist-template.dto';

// jobSite is free text, so it can contain regex metacharacters that would otherwise change
// what the case-insensitive template lookup below actually matches.
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

@Injectable()
export class ChecklistsService {
  constructor(
    @InjectModel(ChecklistTemplate.name)
    private readonly templateModel: Model<ChecklistTemplateDocument>,
    @InjectModel(ChecklistCompletion.name)
    private readonly completionModel: Model<ChecklistCompletionDocument>,
    @InjectModel(ChecklistSubmission.name)
    private readonly submissionModel: Model<ChecklistSubmissionDocument>,
  ) {}

  upsertTemplate(organizationId: string, dto: UpsertChecklistTemplateDto) {
    const jobSite = dto.jobSite?.trim() ?? '';
    return this.templateModel.findOneAndUpdate(
      { organizationId, position: dto.position, jobSite },
      {
        organizationId,
        position: dto.position,
        jobSite,
        title: dto.title?.trim() ?? '',
        openingItems: dto.openingItems,
        closingItems: dto.closingItems,
      },
      { upsert: true, new: true },
    );
  }

  // The blank-jobSite template for a position — what a branch-less pick falls back to, and the
  // last resort when the picked branch has no template of its own.
  private findGenericTemplate(organizationId: string, position: Position) {
    return this.templateModel.findOne({
      organizationId,
      position,
      jobSite: '',
    });
  }

  private async resolveTemplate(
    organizationId: string,
    position: Position,
    jobSite: string,
  ) {
    // A specific branch tries that exact branch first (case/whitespace-insensitive, since
    // jobSite is free text typed independently in different places) before falling back to the
    // position's blank-branch default.
    if (jobSite) {
      const branchSpecific = await this.templateModel.findOne({
        organizationId,
        position,
        jobSite: { $regex: `^${escapeRegExp(jobSite)}$`, $options: 'i' },
      });
      if (branchSpecific) return branchSpecific;
    }
    return this.findGenericTemplate(organizationId, position);
  }

  findAllTemplates(organizationId: string) {
    return this.templateModel
      .find({ organizationId })
      .sort({ position: 1, jobSite: 1 });
  }

  // Resolves the live checklist for a position+branch: the matching template (empty lists if
  // none defined) plus whatever's currently marked on the shared sheet. Not tied to a shift or
  // a day — it persists until someone submits a section (which resets just that section) or a
  // manager edits the template.
  async getCurrent(
    organizationId: string,
    position: Position,
    jobSite: string,
  ) {
    const [template, completion] = await Promise.all([
      this.resolveTemplate(organizationId, position, jobSite),
      this.completionModel.findOne({ organizationId, position, jobSite }),
    ]);

    return {
      position,
      jobSite: jobSite || null,
      title: template?.title || null,
      openingItems: template?.openingItems ?? [],
      closingItems: template?.closingItems ?? [],
      openingStatuses: completion?.openingStatuses ?? [],
      closingStatuses: completion?.closingStatuses ?? [],
    };
  }

  // Sets one item's explicit done/not-done status on the shared sheet — matches the checklist
  // screen's tap-one-item-at-a-time interaction, rather than requiring the whole section be
  // resent.
  async updateItem(
    organizationId: string,
    employeeId: string,
    position: Position,
    jobSite: string,
    section: 'opening' | 'closing',
    item: string,
    done: boolean,
  ) {
    const field = section === 'opening' ? 'openingStatuses' : 'closingStatuses';

    const updated = await this.completionModel.findOneAndUpdate(
      { organizationId, position, jobSite, [`${field}.item`]: item },
      { $set: { [`${field}.$.done`]: done, lastUpdatedBy: employeeId } },
      { new: true },
    );
    if (updated) {
      return updated;
    }

    return this.completionModel.findOneAndUpdate(
      { organizationId, position, jobSite },
      {
        $setOnInsert: { organizationId, position, jobSite },
        $set: { lastUpdatedBy: employeeId },
        $push: { [field]: { item, done } },
      },
      { upsert: true, new: true },
    );
  }

  // Archives the section's current state as a new, independent submission — so someone
  // reviewing history sees every round, even from different people sharing the same
  // position+branch across a day — then resets that section on the shared sheet back to blank.
  // Only once every one of the section's template items has an explicit status.
  async submitSection(
    organizationId: string,
    employeeId: string,
    position: Position,
    jobSite: string,
    section: 'opening' | 'closing',
  ) {
    const template = await this.resolveTemplate(
      organizationId,
      position,
      jobSite,
    );
    const items =
      section === 'opening'
        ? (template?.openingItems ?? [])
        : (template?.closingItems ?? []);
    if (items.length === 0) {
      throw new BadRequestException(
        'There is nothing to submit for this section',
      );
    }

    const completion = await this.completionModel.findOne({
      organizationId,
      position,
      jobSite,
    });
    const statuses =
      section === 'opening'
        ? (completion?.openingStatuses ?? [])
        : (completion?.closingStatuses ?? []);
    const answered = new Set(statuses.map((s) => s.item));
    if (!items.every((item) => answered.has(item))) {
      throw new BadRequestException(
        'Every item must be marked before submitting',
      );
    }

    const submission = await this.submissionModel.create({
      organizationId,
      position,
      jobSite,
      section:
        section === 'opening'
          ? ChecklistSection.OPENING
          : ChecklistSection.CLOSING,
      statuses,
      submittedBy: employeeId,
    });

    const field = section === 'opening' ? 'openingStatuses' : 'closingStatuses';
    await this.completionModel.updateOne(
      { organizationId, position, jobSite },
      { $set: { [field]: [] } },
    );

    return submission;
  }

  // Org-wide, owner/manager only — every submitted checklist round ever, newest first.
  findSubmissions(organizationId: string) {
    return this.submissionModel
      .find({ organizationId })
      .populate('submittedBy', 'fullName role')
      .sort({ createdAt: -1 });
  }
}
