import { Module } from '@nestjs/common';
import { InsuranceController, PlatformInsuranceController } from './insurance.controller';
import { InsuranceService } from './insurance.service';
import { MasterDataModule } from '../master-data/master-data.module';

@Module({
  imports: [MasterDataModule],
  controllers: [InsuranceController, PlatformInsuranceController],
  providers: [InsuranceService],
})
export class InsuranceModule {}
