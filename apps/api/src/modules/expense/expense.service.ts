import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { enforceBranchScope } from '../../common/utils/scope';
import { validateStatusTransition } from '../../common/utils/status-transitions';
import { AuditService } from '../audit/audit.service';
import { LookupValidationService } from '../master-data/lookup-validation.service';
import { NumberGeneratorService } from '../../common/services/number-generator.service';
import { GLPostingService } from '../accounting/gl-posting.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { QueryExpenseDto } from './dto/query-expense.dto';

@Injectable()
export class ExpenseService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, private readonly lookup: LookupValidationService, private readonly numberGen: NumberGeneratorService, private readonly glPosting: GLPostingService) {}

  async create(tenantId: string, actorId: string, dto: CreateExpenseDto) {
    await this.lookup.validateMultiple(tenantId, [
      { categoryCode: 'expense-category', code: dto.category },
    ].filter((v) => v.code));
    const expenseNumber = dto.expenseNumber || (await this.numberGen.generateExpenseNumber(tenantId));
    const expense = await this.prisma.expense.create({
      data: {
        tenantId, branchId: dto.branchId ?? null,
        expenseNumber, category: dto.category ?? null,
        vendorName: dto.vendorName ?? null, vendorId: dto.vendorId ?? null, amount: dto.amount ?? 0,
        currencyCode: dto.currencyCode ?? 'USD', status: dto.status ?? 'PENDING',
        description: dto.description ?? null,
        expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : null,
      },
    });
    await this.audit.logMutation(actorId, tenantId, 'EXPENSE', 'Expense', expense.id, 'CREATE', { expenseNumber: expense.expenseNumber }, expense.branchId ?? undefined);
    return expense;
  }

  async findAll(tenantId: string, query: QueryExpenseDto, activeBranchId?: string) {
    const page = query.page ?? 1; const limit = query.limit ?? 50; const skip = (page - 1) * limit;
    const where: any = { tenantId, deletedAt: null };
    if (query.status) where.status = query.status;
    if (query.branchId) where.branchId = query.branchId;
    if (query.search) where.OR = [{ expenseNumber: { contains: query.search, mode: 'insensitive' } }, { vendorName: { contains: query.search, mode: 'insensitive' } }];
    enforceBranchScope(where, activeBranchId);
    const [data, total] = await Promise.all([this.prisma.expense.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }), this.prisma.expense.count({ where })]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(tenantId: string, id: string) {
    const expense = await this.prisma.expense.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!expense) throw new NotFoundException('Expense not found');
    return expense;
  }

  async update(tenantId: string, actorId: string, id: string, dto: UpdateExpenseDto) {
    const current = await this.findById(tenantId, id);
    await this.lookup.validateMultiple(tenantId, [
      { categoryCode: 'expense-category', code: dto.category },
    ].filter((v) => v.code));
    if (dto.status !== undefined && dto.status !== current.status) {
      const check = validateStatusTransition('expense', current.status, dto.status);
      if (!check.valid) {
        throw new BadRequestException(`Cannot transition from ${current.status} to ${dto.status}. Allowed: ${check.allowed.join(', ') || 'none'}`);
      }
    }
    const becomingApproved = dto.status === 'APPROVED' && current.status !== 'APPROVED';
    const becomingPaid = dto.status === 'PAID' && current.status !== 'PAID';

    const expense = await this.prisma.$transaction(async (tx) => {
      const exp = await tx.expense.update({
        where: { id },
        data: {
          ...(dto.expenseNumber !== undefined && { expenseNumber: dto.expenseNumber }),
          ...(dto.category !== undefined && { category: dto.category }),
          ...(dto.vendorName !== undefined && { vendorName: dto.vendorName }),
          ...(dto.vendorId !== undefined && { vendorId: dto.vendorId }),
          ...(dto.amount !== undefined && { amount: dto.amount }),
          ...(dto.currencyCode !== undefined && { currencyCode: dto.currencyCode }),
          ...(dto.status !== undefined && { status: dto.status }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.expenseDate !== undefined && { expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : null }),
          ...(dto.branchId !== undefined && { branchId: dto.branchId }),
        },
      });
      if (becomingApproved) {
        await this.glPosting.postExpenseAccrual(tx, tenantId, actorId, exp);
      }
      if (becomingPaid) {
        await this.glPosting.postExpenseSettlement(tx, tenantId, actorId, exp);
      }
      return exp;
    });
    await this.audit.logMutation(actorId, tenantId, 'EXPENSE', 'Expense', expense.id, 'UPDATE', { changes: dto }, expense.branchId ?? undefined);
    return expense;
  }

  async remove(tenantId: string, actorId: string, id: string) {
    const expense = await this.findById(tenantId, id);
    await this.prisma.expense.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.logMutation(actorId, tenantId, 'EXPENSE', 'Expense', expense.id, 'DELETE', { expenseNumber: expense.expenseNumber }, expense.branchId ?? undefined);
    return { id, deleted: true };
  }
}
