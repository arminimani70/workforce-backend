import { ForbiddenException, Injectable } from '@nestjs/common';
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
    const jobSite = dto.jobSite?.trim() ?? '';
    return this.templateModel.findOneAndUpdate(
      { organizationId, position: dto.position, jobSite },
      {
        organizationId,
        position: dto.position,
        jobSite,
        openingItems: dto.openingItems,
        closingItems: dto.closingItems,
      },
      { upsert: true, new: true },
    );
  }

  // The blank-jobSite template for a position — what a shift with no branch of its own falls
  // back to, and the last resort when a shift's specific branch has no template of its own.
  private findGenericTemplate(organizationId: string, position: Position) {
    return this.templateModel.findOne({
      organizationId,
      position,
      jobSite: '',
    });
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

    const resolveTemplate = async () => {
      if (!shift.position) return null;

      // A shift with its own branch tries that exact branch first (case/whitespace-insensitive,
      // since jobSite is free text typed independently when scheduling a shift vs. defining a
      // template) before falling back to the position's blank-branch default.
      if (shift.jobSite && shift.jobSite.trim()) {
        const branchSpecific = await this.templateModel.findOne({
          organizationId,
          position: shift.position,
          jobSite: {
            $regex: `^${escapeRegExp(shift.jobSite.trim())}$`,
            $options: 'i',
          },
        });
        if (branchSpecific) return branchSpecific;
      }

      return this.findGenericTemplate(organizationId, shift.position);
    };

    const [template, completion] = await Promise.all([
      resolveTemplate(),
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
