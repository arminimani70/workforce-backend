import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Plan, PlanDocument } from './schemas/plan.schema';

// Seeded once on first boot if the collection is empty — sample tier structure, edit freely
// from the platform-admin panel afterward (this array is never read again once any Plan exists).
const DEFAULT_PLANS = [
  { key: 'starter', name: 'Starter', seatLimit: 10, priceMonthlyEur: 29 },
  { key: 'growth', name: 'Growth', seatLimit: 25, priceMonthlyEur: 69 },
  { key: 'scale', name: 'Scale', seatLimit: 60, priceMonthlyEur: 149 },
];

export interface UpdatePlanFields {
  name?: string;
  seatLimit?: number;
  priceMonthlyEur?: number;
  lemonSqueezyVariantId?: string;
}

@Injectable()
export class PlansService implements OnModuleInit {
  constructor(
    @InjectModel(Plan.name) private readonly planModel: Model<PlanDocument>,
  ) {}

  async onModuleInit() {
    const count = await this.planModel.countDocuments();
    if (count > 0) return;
    await this.planModel.insertMany(DEFAULT_PLANS);
  }

  findAll(): Promise<PlanDocument[]> {
    return this.planModel.find().sort({ priceMonthlyEur: 1 });
  }

  findByKey(key: string): Promise<PlanDocument | null> {
    return this.planModel.findOne({ key });
  }

  async update(key: string, fields: UpdatePlanFields): Promise<PlanDocument> {
    const updated = await this.planModel.findOneAndUpdate({ key }, fields, {
      new: true,
    });
    if (!updated) {
      throw new NotFoundException('Plan not found');
    }
    return updated;
  }
}
