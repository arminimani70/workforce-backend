import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  OrderListTemplate,
  OrderListTemplateSchema,
} from './schemas/order-list-template.schema';
import {
  OrderListSubmission,
  OrderListSubmissionSchema,
} from './schemas/order-list-submission.schema';
import { OrderListsService } from './order-lists.service';
import { OrderListsController } from './order-lists.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OrderListTemplate.name, schema: OrderListTemplateSchema },
      { name: OrderListSubmission.name, schema: OrderListSubmissionSchema },
    ]),
  ],
  controllers: [OrderListsController],
  providers: [OrderListsService],
})
export class OrderListsModule {}
