import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, QueryFilter } from 'mongoose';
import { Shift, ShiftApproval, ShiftDocument } from './schemas/shift.schema';
import { CreateShiftDto } from './dto/create-shift.dto';
import { Position } from '../../common/enums/position.enum';

@Injectable()
export class SchedulingService {
  constructor(
    @InjectModel(Shift.name) private readonly shiftModel: Model<ShiftDocument>,
  ) {}

  create(organizationId: string, createdBy: string, dto: CreateShiftDto) {
    if (new Date(dto.endTime) <= new Date(dto.startTime)) {
      throw new BadRequestException('endTime must be after startTime');
    }

    return this.shiftModel.create({
      organizationId,
      createdBy,
      employeeId: dto.employeeId,
      startTime: dto.startTime,
      endTime: dto.endTime,
      jobSite: dto.jobSite,
      position: dto.position,
    });
  }

  findForEmployee(
    organizationId: string,
    employeeId: string,
    options: { from?: Date; to?: Date; approvedOnly?: boolean } = {},
  ) {
    const filter: QueryFilter<ShiftDocument> = { organizationId, employeeId };
    if (options.from || options.to) {
      filter.startTime = {
        ...(options.from && { $gte: options.from }),
        ...(options.to && { $lte: options.to }),
      };
    }
    if (options.approvedOnly) {
      filter.approval = ShiftApproval.APPROVED;
    }
    return this.shiftModel.find(filter).sort({ startTime: 1 });
  }

  findAllForOrg(organizationId: string) {
    return this.shiftModel.find({ organizationId }).sort({ startTime: 1 });
  }

  async findOne(organizationId: string, shiftId: string) {
    if (!isValidObjectId(shiftId)) {
      throw new NotFoundException('Shift not found');
    }
    const shift = await this.shiftModel.findOne({
      _id: shiftId,
      organizationId,
    });
    if (!shift) {
      throw new NotFoundException('Shift not found');
    }
    return shift;
  }

  // Every approved shift in the org starting in [from, to], with the employee's name/role
  // populated — this is what powers "who else is working today" for any authenticated user,
  // not just owner/manager. Takes the exact window rather than a bare date so the caller's
  // local-timezone day boundaries are used instead of the server's.
  findCoworkersInRange(organizationId: string, from: Date, to: Date) {
    return this.shiftModel
      .find({
        organizationId,
        approval: ShiftApproval.APPROVED,
        startTime: { $gte: from, $lte: to },
      })
      .populate('employeeId', 'fullName role')
      .sort({ startTime: 1 });
  }

  // Used by Tasks to auto-assign: who is approved to work this position on this calendar day?
  // Returns null if nobody is, so the caller can decide how to report that.
  async findEmployeeForPositionOnDate(
    organizationId: string,
    position: Position,
    date: Date,
  ): Promise<string | null> {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const shift = await this.shiftModel.findOne({
      organizationId,
      position,
      approval: ShiftApproval.APPROVED,
      startTime: { $gte: dayStart, $lte: dayEnd },
    });
    return shift ? shift.employeeId.toString() : null;
  }

  private async setApproval(
    organizationId: string,
    shiftId: string,
    approval: ShiftApproval,
  ) {
    if (!isValidObjectId(shiftId)) {
      throw new NotFoundException('Shift not found');
    }

    const shift = await this.shiftModel.findOneAndUpdate(
      { _id: shiftId, organizationId },
      { approval },
      { new: true },
    );
    if (!shift) {
      throw new NotFoundException('Shift not found');
    }
    return shift;
  }

  confirm(organizationId: string, shiftId: string) {
    return this.setApproval(organizationId, shiftId, ShiftApproval.APPROVED);
  }

  reject(organizationId: string, shiftId: string) {
    return this.setApproval(organizationId, shiftId, ShiftApproval.REJECTED);
  }

  // Bulk-confirms every still-pending (draft) shift in the range at once — the "Publish Week"
  // action for a manager who's been building the week's schedule shift by shift and wants it
  // to become visible to employees all together, rather than confirming each one individually.
  async publishRange(organizationId: string, from: Date, to: Date) {
    const result = await this.shiftModel.updateMany(
      {
        organizationId,
        approval: ShiftApproval.PENDING,
        startTime: { $gte: from, $lte: to },
      },
      { approval: ShiftApproval.APPROVED },
    );
    return { publishedCount: result.modifiedCount };
  }
}
