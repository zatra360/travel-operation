import { Module } from '@nestjs/common';
import { BankingController } from './banking.controller';
import { TransactionLogController } from './transaction-log.controller';
import { BankingService } from './banking.service';

@Module({ controllers: [BankingController, TransactionLogController], providers: [BankingService] })
export class BankingModule {}
