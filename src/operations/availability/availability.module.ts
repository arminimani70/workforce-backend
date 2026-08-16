import { Injectable, Module, OnModuleInit } from '@nestjs/common';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Availability,
  AvailabilityDocument,
  AvailabilitySchema,
} from './schemas/availability.schema';
import { AvailabilityService } from './availability.service';
import { AvailabilityController } from './availability.controller';

// The Availability collection was originally keyed one-document-per-employee (a recurring
// weekly pattern), with a unique index on { organizationId, employeeId }. The schema has
// since moved to one document per (employee, exact date), but Mongoose's default index
// sync only *adds* indexes declared on the schema — it never drops ones that are no longer
// declared. Without this, that old unique index survives in already-deployed databases and
// rejects the second-ever availability entry for any employee with an E11000 duplicate key
// error, surfaced to clients as a generic Internal Server Error. syncIndexes() reconciles
// the live collection to exactly what the schema declares, dropping stale indexes too.
@Injectable()
class AvailabilityIndexSync implements OnModuleInit {
  constructor(
    @InjectModel(Availability.name)
    private readonly availabilityModel: Model<AvailabilityDocument>,
  ) {}

  async onModuleInit() {
    await this.availabilityModel.syncIndexes();
  }
}

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Availability.name, schema: AvailabilitySchema },
    ]),
  ],
  controllers: [AvailabilityController],
  providers: [AvailabilityService, AvailabilityIndexSync],
})
export class AvailabilityModule {}
