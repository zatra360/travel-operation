import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountingAuditService } from './accounting-audit.service';
import { CreateGLAccountDto, UpdateGLAccountDto } from './dto/gl-account.dto';

const DEFAULT_COA: Array<{
  code: string; name: string; type: string; balance: string;
  control?: string; manual?: boolean;
}> = [
  { code: '1000', name: 'Cash in Hand', type: 'ASSET', balance: 'DEBIT', control: 'CASH', manual: false },
  { code: '1010', name: 'Bank Accounts', type: 'ASSET', balance: 'DEBIT', control: 'BANK', manual: false },
  { code: '1020', name: 'Petty Cash', type: 'ASSET', balance: 'DEBIT', control: 'PETTY_CASH', manual: false },
  { code: '1100', name: 'Accounts Receivable', type: 'ASSET', balance: 'DEBIT', control: 'ACCOUNTS_RECEIVABLE', manual: false },
  { code: '1200', name: 'Inventory', type: 'ASSET', balance: 'DEBIT', control: 'INVENTORY', manual: false },
  { code: '1300', name: 'Advances, Deposits & Prepayments', type: 'ASSET', balance: 'DEBIT' },
  { code: '1400', name: 'Recoverable Tax (Input VAT)', type: 'ASSET', balance: 'DEBIT', control: 'TAX_RECEIVABLE', manual: false },
  { code: '1500', name: 'Property, Plant & Equipment', type: 'ASSET', balance: 'DEBIT' },
  { code: '1510', name: 'Accumulated Depreciation', type: 'ASSET', balance: 'CREDIT' },
  { code: '2000', name: 'Accounts Payable', type: 'LIABILITY', balance: 'CREDIT', control: 'ACCOUNTS_PAYABLE', manual: false },
  { code: '2100', name: 'Tax Payable (Output VAT)', type: 'LIABILITY', balance: 'CREDIT', control: 'TAX_PAYABLE', manual: false },
  { code: '2200', name: 'Payroll Payable', type: 'LIABILITY', balance: 'CREDIT', control: 'PAYROLL_PAYABLE', manual: false },
  { code: '2300', name: 'Provisions & Accruals', type: 'LIABILITY', balance: 'CREDIT' },
  { code: '2400', name: 'Employee Payable', type: 'LIABILITY', balance: 'CREDIT' },
  { code: '3000', name: 'Share Capital', type: 'EQUITY', balance: 'CREDIT' },
  { code: '3100', name: 'Retained Earnings', type: 'EQUITY', balance: 'CREDIT', control: 'RETAINED_EARNINGS', manual: false },
  { code: '4000', name: 'Service Revenue', type: 'REVENUE', balance: 'CREDIT' },
  { code: '4900', name: 'Other Income', type: 'OTHER_INCOME', balance: 'CREDIT' },
  { code: '5000', name: 'Cost of Services', type: 'COGS', balance: 'DEBIT' },
  { code: '6000', name: 'Salary & Allowances', type: 'EXPENSE', balance: 'DEBIT' },
  { code: '6100', name: 'Office Rent', type: 'EXPENSE', balance: 'DEBIT' },
  { code: '6200', name: 'Utilities', type: 'EXPENSE', balance: 'DEBIT' },
  { code: '6300', name: 'Marketing & Selling', type: 'EXPENSE', balance: 'DEBIT' },
  { code: '6400', name: 'Bank Charges & Fees', type: 'EXPENSE', balance: 'DEBIT' },
  { code: '6500', name: 'Legal & Professional Fees', type: 'EXPENSE', balance: 'DEBIT' },
  { code: '6900', name: 'Depreciation Expense', type: 'EXPENSE', balance: 'DEBIT' },
  { code: '7000', name: 'Other Expense', type: 'OTHER_EXPENSE', balance: 'DEBIT' },
];

@Injectable()
export class GLAccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AccountingAuditService,
  ) {}

  async findAll(tenantId: string, query?: { accountType?: string; isActive?: string; search?: string }) {
    const where: any = { tenantId };
    if (query?.accountType) where.accountType = query.accountType;
    if (query?.isActive !== undefined && query.isActive !== '') where.isActive = query.isActive === 'true';
    if (query?.search) {
      where.OR = [
        { accountCode: { contains: query.search, mode: 'insensitive' } },
        { accountName: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.gLAccount.findMany({ where, orderBy: { accountCode: 'asc' } });
  }

  async findById(tenantId: string, id: string) {
    const account = await this.prisma.gLAccount.findFirst({ where: { id, tenantId } });
    if (!account) throw new NotFoundException('GL account not found');
    return account;
  }

  async create(tenantId: string, actorId: string, dto: CreateGLAccountDto) {
    if (dto.parentAccountId) {
      const parent = await this.prisma.gLAccount.findFirst({ where: { id: dto.parentAccountId, tenantId } });
      if (!parent) throw new BadRequestException('Parent account does not belong to this tenant');
    }
    try {
      const account = await this.prisma.gLAccount.create({
        data: {
          tenantId,
          accountCode: dto.accountCode,
          accountName: dto.accountName,
          accountType: dto.accountType as any,
          normalBalance: dto.normalBalance as any,
          parentAccountId: dto.parentAccountId,
          controlAccountType: dto.controlAccountType,
          currencyCode: dto.currencyCode,
          allowManualPosting: dto.controlAccountType ? (dto.allowManualPosting ?? false) : (dto.allowManualPosting ?? true),
          effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
          effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
          description: dto.description,
          createdById: actorId,
        },
      });
      await this.audit.append({
        tenantId, userId: actorId, action: 'GL_ACCOUNT_CREATED', actionCategory: 'MASTER_DATA',
        tableName: 'GLAccount', recordId: account.id,
        afterState: { accountCode: account.accountCode, accountName: account.accountName, accountType: account.accountType },
      });
      return account;
    } catch (err: any) {
      if (err?.code === 'P2002') throw new ConflictException(`Account code ${dto.accountCode} already exists`);
      throw err;
    }
  }

  async update(tenantId: string, actorId: string, id: string, dto: UpdateGLAccountDto) {
    const current = await this.findById(tenantId, id);

    const hasPostings = await this.prisma.journalItem.count({ where: { accountId: id } });
    if (hasPostings > 0 && dto.controlAccountType !== undefined && dto.controlAccountType !== current.controlAccountType) {
      throw new BadRequestException('Cannot change control classification of an account that has postings');
    }
    if (dto.parentAccountId) {
      if (dto.parentAccountId === id) throw new BadRequestException('An account cannot be its own parent');
      const parent = await this.prisma.gLAccount.findFirst({ where: { id: dto.parentAccountId, tenantId } });
      if (!parent) throw new BadRequestException('Parent account does not belong to this tenant');
    }

    const account = await this.prisma.gLAccount.update({
      where: { id },
      data: {
        ...(dto.accountName !== undefined && { accountName: dto.accountName }),
        ...(dto.parentAccountId !== undefined && { parentAccountId: dto.parentAccountId }),
        ...(dto.controlAccountType !== undefined && { controlAccountType: dto.controlAccountType }),
        ...(dto.allowManualPosting !== undefined && { allowManualPosting: dto.allowManualPosting }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.effectiveFrom !== undefined && { effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null }),
        ...(dto.effectiveTo !== undefined && { effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });

    await this.audit.append({
      tenantId, userId: actorId, action: 'GL_ACCOUNT_UPDATED', actionCategory: 'MASTER_DATA',
      tableName: 'GLAccount', recordId: id,
      beforeState: {
        accountName: current.accountName, controlAccountType: current.controlAccountType,
        allowManualPosting: current.allowManualPosting, isActive: current.isActive,
      },
      afterState: {
        accountName: account.accountName, controlAccountType: account.controlAccountType,
        allowManualPosting: account.allowManualPosting, isActive: account.isActive,
      },
    });

    return account;
  }

  async seedDefaults(tenantId: string, actorId: string) {
    const existing = await this.prisma.gLAccount.count({ where: { tenantId } });
    if (existing > 0) {
      throw new ConflictException('Chart of accounts already contains accounts for this tenant');
    }
    const created = await this.prisma.$transaction(
      DEFAULT_COA.map((a) =>
        this.prisma.gLAccount.create({
          data: {
            tenantId,
            accountCode: a.code,
            accountName: a.name,
            accountType: a.type as any,
            normalBalance: a.balance as any,
            controlAccountType: a.control,
            allowManualPosting: a.manual ?? true,
            createdById: actorId,
          },
        }),
      ),
    );
    await this.audit.append({
      tenantId, userId: actorId, action: 'COA_SEEDED', actionCategory: 'MASTER_DATA',
      tableName: 'GLAccount',
      afterState: { count: created.length },
    });
    return { created: created.length };
  }
}
