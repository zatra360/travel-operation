import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { ActivityModule } from '../activity/activity.module';
import { MasterDataModule } from '../master-data/master-data.module';
import { ClientModule } from '../client/client.module';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [ActivityModule, MasterDataModule, ClientModule, AccountingModule],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
