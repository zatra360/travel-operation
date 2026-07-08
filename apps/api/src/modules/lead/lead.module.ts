import { Module } from '@nestjs/common';
import { LeadController } from './lead.controller';
import { LeadService } from './lead.service';
import { ActivityModule } from '../activity/activity.module';
import { MasterDataModule } from '../master-data/master-data.module';

@Module({
  imports: [ActivityModule, MasterDataModule],
  controllers: [LeadController],
  providers: [LeadService],
  exports: [LeadService],
})
export class LeadModule {}
