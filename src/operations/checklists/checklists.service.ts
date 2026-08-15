import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ChecklistTemplate,
  ChecklistTemplateDocument,
} from './schemas/checklist-template.schema';
import {
  ChecklistCompletion,
  ChecklistCompletionDocument,
} from './schemas/checklist-completion.schema';
import { UpsertChecklistTemplateDto } from './dto/upsert-checklist-template.dto';
import { SchedulingService } from '../scheduling/scheduling.service';
import { UserRole } from '../../users/schemas/user.schema';

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
    private readonly schedulingService: SchedulingService,
  ) {}

  upsertTemplate(organizationId: string, dto: UpsertChecklistTemplateDto) {
    return this.templateModel.findOneAndUpdate(
      { organizationId, position: dto.position, jobSite: dto.jobSite },
      {
        organizationId,
        position: dto.position,
        jobSite: dto.jobSite,
        openingItems: dto.openingItems,
        closingItems: dto.closingItems,
      },
      { upsert: true, new: true },
    );
  }

  findAllTemplates(organizationId: string) {
    return this.templateModel
      .find({ organizationId })
      .sort({ position: 1, jobSite: 1 });
  }

  // Resolves the checklist for one specific shift: the template matching that shift's
  // position+jobSite (empty lists if none has been defined) plus the employee's current
  // progress on it. The shift's own employee can view it; so can owner/manager, for oversight.
  async getShiftChecklist(
    organizationId: string,
    requesterId: string,
    requesterRole: UserRole,
    shiftId: string,
  ) {
    const shift = await this.schedulingService.findOne(organizationId, shiftId);
    const isOwnShift = shift.employeeId.toString() === requesterId;
    const canManage =
      requesterRole === UserRole.OWNER || requesterRole === UserRole.MANAGER;
    if (!isOwnShift && !canManage) {
      throw new ForbiddenException(
        "You can only view your own shift's checklist",
      );
    }

    const [template, completion] = await Promise.all([
      shift.position && shift.jobSite
        ? this.templateModel.findOne({
            organizationId,
            position: shift.position,
            // Case/whitespace-insensitive: jobSite is free text typed independently when
            // scheduling a shift vs. defining a template, so "Downtown" and "downtown " should
            // still match rather than silently missing each other.
            jobSite: {
              $regex: `^${escapeRegExp(shift.jobSite.trim())}$`,
              $options: 'i',
            },
          })
        : null,
      this.completionModel.findOne({ organizationId, shiftId }),
    ]);

    return {
      shiftId,
      position: shift.position ?? null,
      jobSite: shift.jobSite ?? null,
      openingItems: template?.openingItems ?? [],
      closingItems: template?.closingItems ?? [],
      openingCompletedItems: completion?.openingCompletedItems ?? [],
      closingCompletedItems: completion?.closingCompletedItems ?? [],
    };
  }

  async updateCompletion(
    organizationId: string,
    employeeId: string,
    shiftId: string,
    section: 'opening' | 'closing',
    completedItems: string[],
  ) {
    const shift = await this.schedulingService.findOne(organizationId, shiftId);
    if (shift.employeeId.toString() !== employeeId) {
      throw new ForbiddenException(
        'You can only update your own shift checklist',
      );
    }

    const field =
      section === 'opening' ? 'openingCompletedItems' : 'closingCompletedItems';
    return this.completionModel.findOneAndUpdate(
      { organizationId, shiftId },
      { organizationId, shiftId, employeeId, [field]: completedItems },
      { upsert: true, new: true },
    );
  }
}
