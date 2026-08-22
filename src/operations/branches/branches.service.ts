import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { Branch, BranchDocument } from './schemas/branch.schema';
import { UpsertBranchDto } from './dto/upsert-branch.dto';

@Injectable()
export class BranchesService {
  constructor(
    @InjectModel(Branch.name)
    private readonly branchModel: Model<BranchDocument>,
  ) {}

  async upsert(organizationId: string, dto: UpsertBranchDto) {
    const fields = {
      name: dto.name,
      lat: dto.lat,
      lng: dto.lng,
      ...(dto.radiusMeters !== undefined && { radiusMeters: dto.radiusMeters }),
    };

    if (dto.id) {
      if (!isValidObjectId(dto.id)) {
        throw new NotFoundException('Branch not found');
      }
      const updated = await this.branchModel.findOneAndUpdate(
        { _id: dto.id, organizationId },
        fields,
        { returnDocument: 'after' },
      );
      if (!updated) {
        throw new NotFoundException('Branch not found');
      }
      return updated;
    }

    return this.branchModel.create({ organizationId, ...fields });
  }

  list(organizationId: string) {
    return this.branchModel.find({ organizationId }).sort({ name: 1 });
  }

  // Shift.jobSite/ClockInDto.jobSite are plain-text snapshots, not references to this
  // collection (see the schema's comment) — this is how a caller with just a name resolves it
  // back to the branch record, case-insensitively since names are shown/typed inconsistently.
  async findByName(organizationId: string, name: string) {
    const needle = name.trim().toLowerCase();
    const branches = await this.branchModel.find({ organizationId });
    return branches.find((b) => b.name.trim().toLowerCase() === needle) ?? null;
  }

  async delete(organizationId: string, id: string) {
    if (!isValidObjectId(id)) {
      throw new NotFoundException('Branch not found');
    }
    const deleted = await this.branchModel.findOneAndDelete({
      _id: id,
      organizationId,
    });
    if (!deleted) {
      throw new NotFoundException('Branch not found');
    }
  }
}
