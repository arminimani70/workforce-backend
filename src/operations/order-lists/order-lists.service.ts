import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import {
  OrderListTemplate,
  OrderListTemplateDocument,
} from './schemas/order-list-template.schema';
import {
  OrderListSubmission,
  OrderListSubmissionDocument,
} from './schemas/order-list-submission.schema';
import { UpsertOrderListTemplateDto } from './dto/upsert-order-list-template.dto';
import {
  SubmitOrderListDto,
  OrderQuantityDto,
} from './dto/submit-order-list.dto';

@Injectable()
export class OrderListsService {
  constructor(
    @InjectModel(OrderListTemplate.name)
    private readonly templateModel: Model<OrderListTemplateDocument>,
    @InjectModel(OrderListSubmission.name)
    private readonly submissionModel: Model<OrderListSubmissionDocument>,
  ) {}

  async upsertTemplate(
    organizationId: string,
    dto: UpsertOrderListTemplateDto,
  ) {
    const fields = {
      jobSite: dto.jobSite.trim(),
      title: dto.title.trim(),
      items: dto.items,
    };

    if (dto.id) {
      if (!isValidObjectId(dto.id)) {
        throw new NotFoundException('Order list not found');
      }
      const updated = await this.templateModel.findOneAndUpdate(
        { _id: dto.id, organizationId },
        fields,
        { new: true },
      );
      if (!updated) {
        throw new NotFoundException('Order list not found');
      }
      return updated;
    }

    return this.templateModel.create({ organizationId, ...fields });
  }

  // Any authenticated user — the catalog to pick an order list from, grouped by branch on the
  // client.
  listTemplates(organizationId: string) {
    return this.templateModel
      .find({ organizationId })
      .sort({ jobSite: 1, title: 1 });
  }

  async deleteTemplate(organizationId: string, id: string) {
    if (!isValidObjectId(id)) {
      throw new NotFoundException('Order list not found');
    }
    const deleted = await this.templateModel.findOneAndDelete({
      _id: id,
      organizationId,
    });
    if (!deleted) {
      throw new NotFoundException('Order list not found');
    }
  }

  async submit(
    organizationId: string,
    employeeId: string,
    dto: SubmitOrderListDto,
  ) {
    if (!isValidObjectId(dto.orderListTemplateId)) {
      throw new NotFoundException('Order list not found');
    }
    const template = await this.templateModel.findOne({
      _id: dto.orderListTemplateId,
      organizationId,
    });
    if (!template) {
      throw new NotFoundException('Order list not found');
    }

    const quantityByProduct = new Map(
      dto.quantities.map((q) => [q.productName, q.quantity]),
    );
    if (quantityByProduct.size !== template.items.length) {
      throw new BadRequestException(
        'A quantity is required for every product on this list',
      );
    }

    const entries = template.items.map((item) => {
      const quantity = quantityByProduct.get(item.productName);
      if (quantity === undefined) {
        throw new BadRequestException(
          `Missing quantity for "${item.productName}"`,
        );
      }
      return { productName: item.productName, unit: item.unit, quantity };
    });

    return this.submissionModel.create({
      organizationId,
      orderListTemplateId: template._id,
      templateTitle: template.title,
      jobSite: template.jobSite,
      employeeId,
      entries,
    });
  }

  // Org-wide, owner/manager only — every order ever submitted, newest first.
  listSubmissions(organizationId: string) {
    return this.submissionModel
      .find({ organizationId })
      .populate('employeeId', 'fullName role')
      .sort({ createdAt: -1 });
  }

  // Owner/manager correcting a submitted order's quantities after the fact. productName/unit
  // stay exactly as originally submitted — only the quantity values change.
  async updateSubmission(
    organizationId: string,
    id: string,
    quantities: OrderQuantityDto[],
  ) {
    if (!isValidObjectId(id)) {
      throw new NotFoundException('Submission not found');
    }
    const submission = await this.submissionModel.findOne({
      _id: id,
      organizationId,
    });
    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    const quantityByProduct = new Map(
      quantities.map((q) => [q.productName, q.quantity]),
    );
    submission.entries = submission.entries.map((entry) => {
      const quantity = quantityByProduct.get(entry.productName);
      if (quantity === undefined) {
        throw new BadRequestException(
          `Missing quantity for "${entry.productName}"`,
        );
      }
      return { productName: entry.productName, unit: entry.unit, quantity };
    });

    await submission.save();
    return submission;
  }

  async deleteSubmission(organizationId: string, id: string) {
    if (!isValidObjectId(id)) {
      throw new NotFoundException('Submission not found');
    }
    const deleted = await this.submissionModel.findOneAndDelete({
      _id: id,
      organizationId,
    });
    if (!deleted) {
      throw new NotFoundException('Submission not found');
    }
  }
}
