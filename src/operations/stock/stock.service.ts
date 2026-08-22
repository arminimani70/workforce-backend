import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import {
  StockTemplate,
  StockTemplateDocument,
} from './schemas/stock-template.schema';
import {
  StockSubmission,
  StockSubmissionDocument,
} from './schemas/stock-submission.schema';
import { UpsertStockTemplateDto } from './dto/upsert-stock-template.dto';
import { SubmitStockDto, StockQuantityDto } from './dto/submit-stock.dto';

// How far ahead the purchase list looks for a product's next delivery day — matches the
// "order a day or two before" lead time managers actually work with.
const PURCHASE_LOOKAHEAD_DAYS = 2;

// The soonest of today/tomorrow/day-after-tomorrow that has a nonzero par level for this
// product — that's the delivery day the purchase list should be prepping for. Null if none of
// those days has one set.
function findUpcomingTarget(
  parLevels: number[] | undefined,
  from: Date,
): { parLevel: number; date: Date } | null {
  for (let offset = 0; offset <= PURCHASE_LOOKAHEAD_DAYS; offset++) {
    const date = new Date(from);
    date.setDate(date.getDate() + offset);
    const parLevel = parLevels?.[date.getDay()] ?? 0;
    if (parLevel > 0) {
      return { parLevel, date };
    }
  }
  return null;
}

// A stock count is a snapshot from whenever it was last taken — by the time the delivery day
// actually arrives, some of what's on hand will likely have been used. Treating "on hand just
// barely reaches par" as confidently "enough" (or "just barely under" as confidently "buy")
// overstates how precise that snapshot really is. So only call it definitively one way or the
// other outside a tolerance band around par; inside the band, ask the person to recount instead
// of guessing. The band is asymmetric on purpose — running out is worse than over-ordering, so
// the "definitely enough" side needs more headroom (20%) than the "definitely short" side (10%).
const LOW_STOCK_TOLERANCE = 0.1;
const HIGH_STOCK_TOLERANCE = 0.2;

export type PurchaseStatus = 'buy' | 'check' | 'enough';

function classifyStock(
  parLevel: number,
  currentOnHand: number,
): PurchaseStatus {
  if (currentOnHand < parLevel * (1 - LOW_STOCK_TOLERANCE)) return 'buy';
  if (currentOnHand > parLevel * (1 + HIGH_STOCK_TOLERANCE)) return 'enough';
  return 'check';
}

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
        { returnDocument: 'after' },
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

  // Owner/manager correcting a submitted count's quantities after the fact. productName/unit
  // stay exactly as originally submitted — only the quantity values change.
  async updateSubmission(
    organizationId: string,
    id: string,
    quantities: StockQuantityDto[],
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

  // For every product on this list with a delivery day in the next couple of days, compares
  // that day's par level against the most recently counted on-hand quantity and classifies it
  // as 'buy' (confidently short), 'enough' (confidently stocked), or 'check' (too close to par
  // to call from a snapshot count — see classifyStock). Products with no upcoming delivery day
  // (par levels all 0, or the ones set aren't within the lookahead window) are left out
  // entirely — nothing to buy soon.
  async getPurchaseList(organizationId: string, templateId: string) {
    if (!isValidObjectId(templateId)) {
      throw new NotFoundException('Stock list not found');
    }
    const template = await this.templateModel.findOne({
      _id: templateId,
      organizationId,
    });
    if (!template) {
      throw new NotFoundException('Stock list not found');
    }

    // Cast explicitly rather than relying on Mongoose's implicit query-cast for this path — see
    // commit message for why.
    const latestSubmission = await this.submissionModel
      .findOne({
        organizationId,
        stockTemplateId: new Types.ObjectId(templateId),
      })
      .sort({ createdAt: -1 });
    // TEMP debug — remove once the "on hand always 0" issue is confirmed fixed.
    console.log(
      '[getPurchaseList] organizationId=%s templateId=%s found=%s',
      organizationId,
      templateId,
      !!latestSubmission,
    );
    const onHandByProduct = new Map(
      (latestSubmission?.entries ?? []).map((e) => [e.productName, e.quantity]),
    );

    const now = new Date();
    const items = template.items
      .map((item) => {
        const target = findUpcomingTarget(item.parLevels, now);
        if (!target) return null;
        const currentOnHand = onHandByProduct.get(item.productName) ?? 0;
        return {
          productName: item.productName,
          unit: item.unit,
          targetDate: target.date,
          parLevel: target.parLevel,
          currentOnHand,
          suggestedQuantity: Math.max(0, target.parLevel - currentOnHand),
          status: classifyStock(target.parLevel, currentOnHand),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => a.targetDate.getTime() - b.targetDate.getTime());

    return {
      templateId: template._id,
      templateTitle: template.title,
      jobSite: template.jobSite,
      lastCountedAt: latestSubmission?.createdAt ?? null,
      items,
    };
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
