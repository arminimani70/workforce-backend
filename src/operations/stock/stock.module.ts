import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  StockTemplate,
  StockTemplateSchema,
} from './schemas/stock-template.schema';
import {
  StockSubmission,
  StockSubmissionSchema,
} from './schemas/stock-submission.schema';
import { StockService } from './stock.service';
import { StockController } from './stock.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StockTemplate.name, schema: StockTemplateSchema },
      { name: StockSubmission.name, schema: StockSubmissionSchema },
    ]),
  ],
  controllers: [StockController],
  providers: [StockService],
})
export class StockModule {}
