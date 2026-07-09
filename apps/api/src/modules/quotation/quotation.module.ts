import { Module } from '@nestjs/common';
import { QuotationController } from './quotation.controller';
import { QuotationService } from './quotation.service';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [ActivityModule],
  controllers: [QuotationController],
  providers: [QuotationService],
  exports: [QuotationService],
})
export class QuotationModule {}
