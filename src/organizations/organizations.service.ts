import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Organization,
  OrganizationDocument,
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
}
