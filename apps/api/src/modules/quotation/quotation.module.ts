import { Module } from '@nestjs/common';
import { QuotationController } from './quotation.controller';
import { QuotationService } from './quotation.service';
import { PublicQuotationController } from './public/public-quotation.controller';
import { ActivityModule } from '../activity/activity.module';
import { NotificationModule } from '../notification/notification.module';
import { MasterDataModule } from '../master-data/master-data.module';

@Module({
  imports: [ActivityModule, NotificationModule, MasterDataModule],
  controllers: [QuotationController, PublicQuotationController],
  providers: [QuotationService],
  exports: [QuotationService],
})
export class QuotationModule {}
