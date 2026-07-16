import { Module } from '@nestjs/common';
import { ExpenseController } from './expense.controller';
import { ExpenseService } from './expense.service';
import { MasterDataModule } from '../master-data/master-data.module';
import { AccountingModule } from '../accounting/accounting.module';

@Module({ imports: [MasterDataModule, AccountingModule], controllers: [ExpenseController], providers: [ExpenseService], exports: [ExpenseService] })
export class ExpenseModule {}
