import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { Shift, ShiftApproval, ShiftDocument } from './schemas/shift.schema';
import {
  ShiftEditRequest,
  ShiftEditRequestDocument,
  ShiftEditRequestStatus,
} from './schemas/shift-edit-request.schema';
import { CreateShiftEditRequestDto } from './dto/create-shift-edit-request.dto';

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

@Injectable()
export class ShiftEditRequestsService {
  constructor(
    @InjectModel(Shift.name) private readonly shiftModel: Model<ShiftDocument>,
    @InjectModel(ShiftEditRequest.name)
    private readonly editRequestModel: Model<ShiftEditRequestDocument>,
  ) {}

  async create(
    organizationId: string,
    employeeId: string,
    dto: CreateShiftEditRequestDto,
  ) {
    const shift = await this.shiftModel.findOne({
      _id: dto.shiftId,
      organizationId,
    });
    if (!shift) {
      throw new NotFoundException('Shift not found');
    }
    if (shift.employeeId.toString() !== employeeId) {
      throw new ForbiddenException(
        'You can only request edits to your own shifts',
      );
    }
    if (shift.approval !== ShiftApproval.APPROVED) {
      throw new BadRequestException('Only an approved shift can be edited');
    }
    // "Past" means strictly before today's calendar day — a shift that already ended earlier
    // today still isn't eligible, only yesterday's or older.
    if (new Date(shift.startTime) >= startOfToday()) {
      throw new BadRequestException(
        'Only a past shift (at least yesterday) can be edited this way',
      );
    }

    const newStartTime = new Date(dto.startTime);
    const newEndTime = new Date(dto.endTime);
    if (newEndTime <= newStartTime) {
      throw new BadRequestException('End time must be after start time');
    }

    return this.editRequestModel.create({
      organizationId,
      shiftId: shift._id,
      requestedBy: employeeId,
      newStartTime,
      newEndTime,
    });
  }

  findMine(organizationId: string, employeeId: string) {
    return this.editRequestModel
      .find({ organizationId, requestedBy: employeeId })
      .populate('shiftId')
      .sort({ createdAt: -1 });
  }

  findPendingForOrg(organizationId: string) {
    return this.editRequestModel
      .find({ organizationId, status: ShiftEditRequestStatus.PENDING })
      .populate('requestedBy', 'fullName role')
      .populate('shiftId')
      .sort({ createdAt: -1 });
  }

  private async findOwnedRequest(organizationId: string, id: string) {
    if (!isValidObjectId(id)) {
      throw new NotFoundException('Edit request not found');
    }
    const request = await this.editRequestModel.findOne({
      _id: id,
      organizationId,
    });
    if (!request) {
      throw new NotFoundException('Edit request not found');
    }
    return request;
  }

  async cancel(organizationId: string, id: string, employeeId: string) {
    const request = await this.findOwnedRequest(organizationId, id);
    if (request.requestedBy.toString() !== employeeId) {
      throw new ForbiddenException(
        'Only the requester can cancel this request',
      );
    }
    if (request.status !== ShiftEditRequestStatus.PENDING) {
      throw new BadRequestException('This request can no longer be cancelled');
    }
    request.status = ShiftEditRequestStatus.CANCELLED;
    await request.save();
    return request;
  }

  async approve(organizationId: string, id: string, managerId: string) {
    const request = await this.findOwnedRequest(organizationId, id);
    if (request.status !== ShiftEditRequestStatus.PENDING) {
      throw new BadRequestException('This request is no longer pending');
    }

    await this.shiftModel.updateOne(
      { _id: request.shiftId },
      { startTime: request.newStartTime, endTime: request.newEndTime },
    );

    request.status = ShiftEditRequestStatus.APPROVED;
    request.decidedBy = new Types.ObjectId(managerId);
    await request.save();
    return request;
  }

  async reject(organizationId: string, id: string, managerId: string) {
    const request = await this.findOwnedRequest(organizationId, id);
    if (request.status !== ShiftEditRequestStatus.PENDING) {
      throw new BadRequestException('This request is no longer pending');
    }
    request.status = ShiftEditRequestStatus.REJECTED;
    request.decidedBy = new Types.ObjectId(managerId);
    await request.save();
    return request;
  }
}
