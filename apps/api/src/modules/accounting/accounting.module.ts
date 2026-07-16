import { Module } from '@nestjs/common';
import {
  GLAccountController,
  FiscalPeriodController,
  JournalController,
  AccountingReportController,
} from './accounting.controller';
import { GLAccountService } from './gl-account.service';
import { FiscalPeriodService } from './fiscal-period.service';
import { JournalService } from './journal.service';
import { AuditLedgerService } from './audit-ledger.service';
import { AccountingAuditService } from './accounting-audit.service';
import { GLPostingService } from './gl-posting.service';
import { FinancialReportsService } from './financial-reports.service';

@Module({
  controllers: [GLAccountController, FiscalPeriodController, JournalController, AccountingReportController],
  providers: [GLAccountService, FiscalPeriodService, JournalService, AuditLedgerService, AccountingAuditService, GLPostingService, FinancialReportsService],
  exports: [JournalService, GLAccountService, FiscalPeriodService, AccountingAuditService, GLPostingService, FinancialReportsService],
})
export class AccountingModule {}
