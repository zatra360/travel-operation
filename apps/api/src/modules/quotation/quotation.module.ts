import { Module } from '@nestjs/common';
import { QuotationController } from './quotation.controller';
import { QuotationService } from './quotation.service';
import { PublicQuotationController } from './public/public-quotation.controller';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [ActivityModule],
  controllers: [QuotationController, PublicQuotationController],
  providers: [QuotationService],
  exports: [QuotationService],
})
export class QuotationModule {}
