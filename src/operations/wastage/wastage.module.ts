import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  WastageReason,
  WastageReasonSchema,
} from './schemas/wastage-reason.schema';
import {
  WastageEntry,
  WastageEntrySchema,
} from './schemas/wastage-entry.schema';
import { WastageService } from './wastage.service';
import { WastageController } from './wastage.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WastageReason.name, schema: WastageReasonSchema },
      { name: WastageEntry.name, schema: WastageEntrySchema },
    ]),
  ],
  controllers: [WastageController],
  providers: [WastageService],
})
export class WastageModule {}
