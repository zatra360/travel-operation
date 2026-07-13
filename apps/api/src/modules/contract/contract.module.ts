import { Module } from '@nestjs/common';
import { ContractController, PublicContractController } from './contract.controller';
import { ContractService } from './contract.service';

@Module({
  controllers: [ContractController, PublicContractController],
  providers: [ContractService],
  exports: [ContractService],
})
export class ContractModule {}
