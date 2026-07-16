import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard, TenantGuard, PermissionsGuard, RequirePermissions, TenantCtx, TenantContext } from '../../common';
import { GLAccountService } from './gl-account.service';
import { FiscalPeriodService } from './fiscal-period.service';
import { JournalService } from './journal.service';
import { AuditLedgerService } from './audit-ledger.service';
import { FinancialReportsService } from './financial-reports.service';
import { CreateGLAccountDto, UpdateGLAccountDto } from './dto/gl-account.dto';
import { CreateFiscalYearDto, ClosePeriodDto, ReopenPeriodDto } from './dto/fiscal-period.dto';
import { CreateJournalDto, QueryJournalDto, ReverseJournalDto } from './dto/journal.dto';

@ApiTags('Tenant - Accounting - Chart of Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/accounting/accounts')
export class GLAccountController {
  constructor(private readonly service: GLAccountService) {}

  @Get()
  @RequirePermissions('GL_ACCOUNT_READ')
  @ApiOperation({ summary: 'List chart of accounts' })
  findAll(
    @TenantCtx() ctx: TenantContext,
    @Query('accountType') accountType?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAll(ctx.tenantId, { accountType, isActive, search });
  }

  @Get(':id')
  @RequirePermissions('GL_ACCOUNT_READ')
  @ApiOperation({ summary: 'Get GL account' })
  findById(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.service.findById(ctx.tenantId, id);
  }

  @Post()
  @RequirePermissions('GL_ACCOUNT_CREATE')
  @ApiOperation({ summary: 'Create GL account' })
  create(@TenantCtx() ctx: TenantContext, @Body() dto: CreateGLAccountDto) {
    return this.service.create(ctx.tenantId, ctx.userId, dto);
  }

  @Put(':id')
  @RequirePermissions('GL_ACCOUNT_UPDATE')
  @ApiOperation({ summary: 'Update GL account (non-financial attributes only)' })
  update(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: UpdateGLAccountDto) {
    return this.service.update(ctx.tenantId, ctx.userId, id, dto);
  }

  @Post('seed-defaults')
  @RequirePermissions('GL_ACCOUNT_MANAGE')
  @ApiOperation({ summary: 'Seed a default chart of accounts (empty tenants only)' })
  seedDefaults(@TenantCtx() ctx: TenantContext) {
    return this.service.seedDefaults(ctx.tenantId, ctx.userId);
  }
}

@ApiTags('Tenant - Accounting - Fiscal Periods')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/accounting')
export class FiscalPeriodController {
  constructor(private readonly service: FiscalPeriodService) {}

  @Get('fiscal-years')
  @RequirePermissions('ACCOUNTING_PERIOD_READ')
  @ApiOperation({ summary: 'List fiscal years with periods' })
  findAll(@TenantCtx() ctx: TenantContext) {
    return this.service.findAll(ctx.tenantId);
  }

  @Post('fiscal-years')
  @RequirePermissions('ACCOUNTING_PERIOD_CREATE')
  @ApiOperation({ summary: 'Create a fiscal year (auto-generates monthly periods)' })
  createFiscalYear(@TenantCtx() ctx: TenantContext, @Body() dto: CreateFiscalYearDto) {
    return this.service.createFiscalYear(ctx.tenantId, ctx.userId, dto);
  }

  @Post('periods/:id/close')
  @RequirePermissions('ACCOUNTING_PERIOD_MANAGE')
  @ApiOperation({ summary: 'Soft-close, close or permanently lock an accounting period' })
  closePeriod(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: ClosePeriodDto) {
    return this.service.closePeriod(ctx.tenantId, ctx.userId, id, dto);
  }

  @Post('periods/:id/reopen')
  @RequirePermissions('ACCOUNTING_PERIOD_MANAGE')
  @ApiOperation({ summary: 'Reopen a closed period (requires reason; locked periods can never reopen)' })
  reopenPeriod(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: ReopenPeriodDto) {
    return this.service.reopenPeriod(ctx.tenantId, ctx.userId, id, dto);
  }
}

@ApiTags('Tenant - Accounting - Journals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/accounting/journals')
export class JournalController {
  constructor(private readonly service: JournalService) {}

  @Get()
  @RequirePermissions('JOURNAL_READ')
  @ApiOperation({ summary: 'List journal entries' })
  findAll(@TenantCtx() ctx: TenantContext, @Query() query: QueryJournalDto) {
    return this.service.findAll(ctx.tenantId, query);
  }

  @Get(':id')
  @RequirePermissions('JOURNAL_READ')
  @ApiOperation({ summary: 'Get journal entry with lines and links' })
  findById(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.service.findById(ctx.tenantId, id);
  }

  @Post()
  @RequirePermissions('JOURNAL_CREATE')
  @ApiOperation({ summary: 'Create a DRAFT journal entry' })
  create(@TenantCtx() ctx: TenantContext, @Body() dto: CreateJournalDto) {
    return this.service.createDraft(ctx.tenantId, ctx.userId, ctx.branchId, dto);
  }

  @Put(':id')
  @RequirePermissions('JOURNAL_UPDATE')
  @ApiOperation({ summary: 'Replace a DRAFT journal entry' })
  update(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: CreateJournalDto) {
    return this.service.updateDraft(ctx.tenantId, ctx.userId, id, dto);
  }

  @Post(':id/approve')
  @RequirePermissions('JOURNAL_MANAGE')
  @ApiOperation({ summary: 'Approve a journal entry (approver must differ from creator)' })
  approve(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.service.approve(ctx.tenantId, ctx.userId, id);
  }

  @Post(':id/post')
  @RequirePermissions('JOURNAL_MANAGE')
  @ApiHeader({ name: 'Idempotency-Key', required: false })
  @ApiOperation({ summary: 'Post a journal entry through the hardened database posting function' })
  post(
    @TenantCtx() ctx: TenantContext,
    @Param('id') id: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.service.post(ctx.tenantId, ctx.userId, id, idempotencyKey);
  }

  @Post(':id/reverse')
  @RequirePermissions('JOURNAL_MANAGE')
  @ApiOperation({ summary: 'Reverse a posted journal entry (creates a mirrored opposite entry)' })
  reverse(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: ReverseJournalDto) {
    return this.service.reverse(ctx.tenantId, ctx.userId, id, dto);
  }
}

@ApiTags('Tenant - Accounting - Reports & Audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/accounting')
export class AccountingReportController {
  constructor(
    private readonly journals: JournalService,
    private readonly auditLedger: AuditLedgerService,
    private readonly reports: FinancialReportsService,
  ) {}

  @Get('reports/trial-balance')
  @RequirePermissions('JOURNAL_READ')
  @ApiOperation({ summary: 'Trial balance from posted entries' })
  trialBalance(
    @TenantCtx() ctx: TenantContext,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.journals.trialBalance(ctx.tenantId, dateFrom, dateTo);
  }

  @Get('reports/income-statement')
  @RequirePermissions('JOURNAL_READ')
  @ApiOperation({ summary: 'Income statement (P&L) from posted entries' })
  incomeStatement(
    @TenantCtx() ctx: TenantContext,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.reports.incomeStatement(ctx.tenantId, dateFrom, dateTo);
  }

  @Get('reports/balance-sheet')
  @RequirePermissions('JOURNAL_READ')
  @ApiOperation({ summary: 'Balance sheet (statement of financial position) as of a date' })
  balanceSheet(@TenantCtx() ctx: TenantContext, @Query('asOf') asOf?: string) {
    return this.reports.balanceSheet(ctx.tenantId, asOf);
  }

  @Get('reports/general-ledger/:accountId')
  @RequirePermissions('JOURNAL_READ')
  @ApiOperation({ summary: 'Account ledger with running balance' })
  generalLedger(
    @TenantCtx() ctx: TenantContext,
    @Param('accountId') accountId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.reports.generalLedger(ctx.tenantId, accountId, dateFrom, dateTo);
  }

  @Get('audit-logs')
  @RequirePermissions('AUDIT_LOG_READ')
  @ApiOperation({ summary: 'List immutable system audit ledger events' })
  auditLogs(
    @TenantCtx() ctx: TenantContext,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('action') action?: string,
    @Query('tableName') tableName?: string,
    @Query('recordId') recordId?: string,
  ) {
    return this.auditLedger.findAll(ctx.tenantId, { page, limit, action, tableName, recordId });
  }

  @Get('audit-logs/verify')
  @RequirePermissions('AUDIT_LOG_READ')
  @ApiOperation({ summary: 'Verify the tenant audit hash chain (tamper evidence)' })
  verifyChain(@TenantCtx() ctx: TenantContext) {
    return this.auditLedger.verifyChain(ctx.tenantId);
  }
}
