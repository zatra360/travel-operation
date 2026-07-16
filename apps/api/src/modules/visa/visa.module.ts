import { Module } from '@nestjs/common';
import { VisaController, VisaListController } from './visa.controller';
import { VisaService } from './visa.service';
import { MasterDataModule } from '../master-data/master-data.module';

@Module({
  imports: [MasterDataModule],
  controllers: [VisaController, VisaListController],
  providers: [VisaService],
  exports: [VisaService],
})
export class VisaModule {}
