import { Module } from '@nestjs/common';
import { ContractController, PublicContractController, ContractListController } from './contract.controller';
import { ContractService } from './contract.service';
import { MasterDataModule } from '../master-data/master-data.module';

@Module({
  imports: [MasterDataModule],
  controllers: [ContractController, PublicContractController, ContractListController],
  providers: [ContractService],
  exports: [ContractService],
})
export class ContractModule {}
