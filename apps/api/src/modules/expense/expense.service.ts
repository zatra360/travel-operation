import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { QueryExpenseDto } from './dto/query-expense.dto';

@Injectable()
export class ExpenseService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async create(tenantId: string, actorId: string, dto: CreateExpenseDto) {
    const expense = await this.prisma.expense.create({
      data: {
        tenantId, branchId: dto.branchId ?? null,
        expenseNumber: dto.expenseNumber, category: dto.category ?? null,
        vendorName: dto.vendorName ?? null, amount: dto.amount ?? 0,
        currencyCode: dto.currencyCode ?? 'USD', status: dto.status ?? 'PENDING',
        description: dto.description ?? null,
        expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : null,
      },
    });
    await this.audit.logMutation(actorId, tenantId, 'EXPENSE', 'Expense', expense.id, 'CREATE', { expenseNumber: expense.expenseNumber }, expense.branchId ?? undefined);
    return expense;
  }

  async findAll(tenantId: string, query: QueryExpenseDto) {
    const page = query.page ?? 1; const limit = query.limit ?? 50; const skip = (page - 1) * limit;
    const where: any = { tenantId, deletedAt: null };
    if (query.status) where.status = query.status;
    if (query.branchId) where.branchId = query.branchId;
    if (query.search) where.OR = [{ expenseNumber: { contains: query.search, mode: 'insensitive' } }, { vendorName: { contains: query.search, mode: 'insensitive' } }];
    const [data, total] = await Promise.all([this.prisma.expense.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }), this.prisma.expense.count({ where })]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(tenantId: string, id: string) {
    const expense = await this.prisma.expense.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!expense) throw new NotFoundException('Expense not found');
    return expense;
  }

  async update(tenantId: string, actorId: string, id: string, dto: UpdateExpenseDto) {
    await this.findById(tenantId, id);
    const expense = await this.prisma.expense.update({
      where: { id },
      data: {
        ...(dto.expenseNumber !== undefined && { expenseNumber: dto.expenseNumber }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.vendorName !== undefined && { vendorName: dto.vendorName }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.currencyCode !== undefined && { currencyCode: dto.currencyCode }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.expenseDate !== undefined && { expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : null }),
        ...(dto.branchId !== undefined && { branchId: dto.branchId }),
      },
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
