import { Module } from '@nestjs/common';
import { RefundController } from './refund.controller';
import { RefundService } from './refund.service';
import { ActivityModule } from '../activity/activity.module';
import { MasterDataModule } from '../master-data/master-data.module';
import { ClientModule } from '../client/client.module';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [ActivityModule, MasterDataModule, ClientModule, AccountingModule],
  controllers: [RefundController],
  providers: [RefundService],
  exports: [RefundService],
})
export class RefundModule {}
