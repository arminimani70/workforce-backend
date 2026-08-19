import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import {
  StockTemplate,
  StockTemplateDocument,
} from './schemas/stock-template.schema';
import {
  StockSubmission,
  StockSubmissionDocument,
} from './schemas/stock-submission.schema';
import { UpsertStockTemplateDto } from './dto/upsert-stock-template.dto';
import { SubmitStockDto } from './dto/submit-stock.dto';

@Injectable()
export class StockService {
  constructor(
    @InjectModel(StockTemplate.name)
    private readonly templateModel: Model<StockTemplateDocument>,
    @InjectModel(StockSubmission.name)
    private readonly submissionModel: Model<StockSubmissionDocument>,
  ) {}

  async upsertTemplate(organizationId: string, dto: UpsertStockTemplateDto) {
    const fields = {
      jobSite: dto.jobSite.trim(),
      title: dto.title.trim(),
      items: dto.items,
    };

    if (dto.id) {
      if (!isValidObjectId(dto.id)) {
        throw new NotFoundException('Stock list not found');
      }
      const updated = await this.templateModel.findOneAndUpdate(
        { _id: dto.id, organizationId },
        fields,
        { new: true },
      );
      if (!updated) {
        throw new NotFoundException('Stock list not found');
      }
      return updated;
    }

    return this.templateModel.create({ organizationId, ...fields });
  }

  // Any authenticated user — the catalog to pick a stock list from, grouped by branch on the
  // client.
  listTemplates(organizationId: string) {
    return this.templateModel
      .find({ organizationId })
      .sort({ jobSite: 1, title: 1 });
  }

  async deleteTemplate(organizationId: string, id: string) {
    if (!isValidObjectId(id)) {
      throw new NotFoundException('Stock list not found');
    }
    const deleted = await this.templateModel.findOneAndDelete({
      _id: id,
      organizationId,
    });
    if (!deleted) {
      throw new NotFoundException('Stock list not found');
    }
  }

  async submit(
    organizationId: string,
    employeeId: string,
    dto: SubmitStockDto,
  ) {
    if (!isValidObjectId(dto.stockTemplateId)) {
      throw new NotFoundException('Stock list not found');
    }
    const template = await this.templateModel.findOne({
      _id: dto.stockTemplateId,
      organizationId,
    });
    if (!template) {
      throw new NotFoundException('Stock list not found');
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
      stockTemplateId: template._id,
      templateTitle: template.title,
      jobSite: template.jobSite,
      employeeId,
      entries,
    });
  }

  // Org-wide, owner/manager only — every stock count ever submitted, newest first.
  listSubmissions(organizationId: string) {
    return this.submissionModel
      .find({ organizationId })
      .populate('employeeId', 'fullName role')
      .sort({ createdAt: -1 });
  }
}
