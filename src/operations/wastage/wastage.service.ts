import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import {
  WastageReason,
  WastageReasonDocument,
} from './schemas/wastage-reason.schema';
import {
  WastageEntry,
  WastageEntryDocument,
} from './schemas/wastage-entry.schema';
import { UpsertWastageReasonDto } from './dto/upsert-wastage-reason.dto';
import { CreateWastageEntryDto } from './dto/create-wastage-entry.dto';

@Injectable()
export class WastageService {
  constructor(
    @InjectModel(WastageReason.name)
    private readonly reasonModel: Model<WastageReasonDocument>,
    @InjectModel(WastageEntry.name)
    private readonly entryModel: Model<WastageEntryDocument>,
  ) {}

  async upsertReason(organizationId: string, dto: UpsertWastageReasonDto) {
    const label = dto.label.trim();

    if (dto.id) {
      if (!isValidObjectId(dto.id)) {
        throw new NotFoundException('Reason not found');
      }
      const updated = await this.reasonModel.findOneAndUpdate(
        { _id: dto.id, organizationId },
        { label },
        { returnDocument: 'after' },
      );
      if (!updated) {
        throw new NotFoundException('Reason not found');
      }
      return updated;
    }

    return this.reasonModel.create({ organizationId, label });
  }

  // Any authenticated user — populates the reason picker on the submission form.
  listReasons(organizationId: string) {
    return this.reasonModel.find({ organizationId }).sort({ label: 1 });
  }

  async deleteReason(organizationId: string, id: string) {
    if (!isValidObjectId(id)) {
      throw new NotFoundException('Reason not found');
    }
    const deleted = await this.reasonModel.findOneAndDelete({
      _id: id,
      organizationId,
    });
    if (!deleted) {
      throw new NotFoundException('Reason not found');
    }
  }

  create(
    organizationId: string,
    employeeId: string,
    dto: CreateWastageEntryDto,
  ) {
    return this.entryModel.create({
      organizationId,
      employeeId,
      jobSite: dto.jobSite,
      reason: dto.reason,
      productName: dto.productName,
      amount: dto.amount,
      occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined,
    });
  }

  // Org-wide, owner/manager only — every wastage report ever submitted, newest first.
  listEntries(organizationId: string) {
    return this.entryModel
      .find({ organizationId })
      .populate('employeeId', 'fullName role')
      .sort({ createdAt: -1 });
  }
}
