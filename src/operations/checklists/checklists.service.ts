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
import { UpsertChecklistTemplateDto } from './dto/upsert-checklist-template.dto';

// jobSite is free text, so it can contain regex metacharacters that would otherwise change
// what the case-insensitive template lookup below actually matches.
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

@Injectable()
export class ChecklistsService {
  constructor(
    @InjectModel(ChecklistTemplate.name)
    private readonly templateModel: Model<ChecklistTemplateDocument>,
    @InjectModel(ChecklistCompletion.name)
    private readonly completionModel: Model<ChecklistCompletionDocument>,
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

  // Resolves today's checklist for the caller: the template matching the given position+branch
  // (empty lists if none defined) plus the caller's own progress on it so far today. Not tied
  // to a shift — a checklist can be opened and filled even on a day with no shift scheduled.
  async getToday(
    organizationId: string,
    employeeId: string,
    position: Position,
    jobSite: string,
  ) {
    const date = startOfToday();
    const [template, completion] = await Promise.all([
      this.resolveTemplate(organizationId, position, jobSite),
      this.completionModel.findOne({
        organizationId,
        employeeId,
        date,
        position,
        jobSite,
      }),
    ]);

    return {
      date: date.toISOString(),
      position,
      jobSite: jobSite || null,
      title: template?.title || null,
      openingItems: template?.openingItems ?? [],
      closingItems: template?.closingItems ?? [],
      openingStatuses: completion?.openingStatuses ?? [],
      closingStatuses: completion?.closingStatuses ?? [],
      openingSubmittedAt: completion?.openingSubmittedAt ?? null,
      closingSubmittedAt: completion?.closingSubmittedAt ?? null,
    };
  }

  // Sets one item's explicit done/not-done status for today — matches the checklist screen's
  // tap-one-item-at-a-time interaction, rather than requiring the whole section be resent.
  async updateItem(
    organizationId: string,
    employeeId: string,
    position: Position,
    jobSite: string,
    section: 'opening' | 'closing',
    item: string,
    done: boolean,
  ) {
    const date = startOfToday();
    const field = section === 'opening' ? 'openingStatuses' : 'closingStatuses';

    const updated = await this.completionModel.findOneAndUpdate(
      {
        organizationId,
        employeeId,
        date,
        position,
        jobSite,
        [`${field}.item`]: item,
      },
      { $set: { [`${field}.$.done`]: done } },
      { new: true },
    );
    if (updated) {
      return updated;
    }

    return this.completionModel.findOneAndUpdate(
      { organizationId, employeeId, date, position, jobSite },
      {
        $setOnInsert: { organizationId, employeeId, date, position, jobSite },
        $push: { [field]: { item, done } },
      },
      { upsert: true, new: true },
    );
  }

  // Marks a section submitted — only once every one of its template items has an explicit
  // status, so a manager reviewing submissions never sees a section that's silently incomplete.
  async submitSection(
    organizationId: string,
    employeeId: string,
    position: Position,
    jobSite: string,
    section: 'opening' | 'closing',
  ) {
    const date = startOfToday();
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
      employeeId,
      date,
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

    const field =
      section === 'opening' ? 'openingSubmittedAt' : 'closingSubmittedAt';
    return this.completionModel.findOneAndUpdate(
      { organizationId, employeeId, date, position, jobSite },
      { $set: { [field]: new Date() } },
      { new: true },
    );
  }

  // Org-wide, owner/manager only — every checklist with at least one submitted section, newest
  // first.
  findSubmissions(organizationId: string) {
    return this.completionModel
      .find({
        organizationId,
        $or: [
          { openingSubmittedAt: { $ne: null } },
          { closingSubmittedAt: { $ne: null } },
        ],
      })
      .populate('employeeId', 'fullName role')
      .sort({ date: -1, updatedAt: -1 });
  }
}
