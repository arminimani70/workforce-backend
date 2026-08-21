import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Organization,
  OrganizationDocument,
  SubscriptionStatus,
} from './schemas/organization.schema';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectModel(Organization.name)
    private readonly organizationModel: Model<OrganizationDocument>,
  ) {}

  create(name: string, industry?: string): Promise<OrganizationDocument> {
    return this.organizationModel.create({ name, industry });
  }

  async setOwner(
    organizationId: Types.ObjectId,
    ownerId: Types.ObjectId,
  ): Promise<void> {
    await this.organizationModel.updateOne(
      { _id: organizationId },
      { ownerId },
    );
  }

  async findById(
    organizationId: Types.ObjectId | string,
  ): Promise<OrganizationDocument> {
    const organization = await this.organizationModel.findById(organizationId);
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }
    return organization;
  }

  findAll(): Promise<OrganizationDocument[]> {
    return this.organizationModel.find().sort({ createdAt: -1 });
  }

  // Owner/manager adding a team member goes through this first — TeamScreen's "add employee"
  // and nothing else consumes a seat, so this is the only enforcement point.
  async assertSeatAvailable(
    organizationId: Types.ObjectId | string,
    currentUserCount: number,
  ): Promise<void> {
    const organization = await this.findById(organizationId);
    if (currentUserCount >= organization.seatLimit) {
      throw new ForbiddenException(
        `Seat limit reached (${organization.seatLimit}). Upgrade your plan to add more team members.`,
      );
    }
  }

  // Called from the billing webhook once a checkout's organization_id custom data resolves a
  // subscription event — the only writer of these fields outside the trial default.
  async updateSubscription(
    organizationId: string,
    fields: {
      subscriptionStatus: SubscriptionStatus;
      seatLimit?: number;
      planId?: string;
      lemonSqueezyCustomerId?: string;
      lemonSqueezySubscriptionId?: string;
      currentPeriodEnd?: Date;
    },
  ): Promise<void> {
    await this.organizationModel.updateOne({ _id: organizationId }, fields);
  }
}
