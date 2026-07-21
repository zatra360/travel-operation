import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateBankAccountDto, UpdateBankAccountDto, CreateCashRegisterDto, UpdateCashRegisterDto } from './dto/banking.dto';

@Injectable()
export class BankingService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async createAccount(tenantId: string, actorId: string, dto: CreateBankAccountDto) {
    const account = await this.prisma.bankAccount.create({
      data: {
        tenantId, branchId: dto.branchId ?? null,
        bankName: dto.bankName, accountName: dto.accountName, accountNumber: dto.accountNumber,
        routingNumber: dto.routingNumber ?? null, swiftCode: dto.swiftCode ?? null,
        currencyCode: dto.currencyCode ?? 'USD', openingBalance: dto.openingBalance ?? 0,
        currentBalance: dto.openingBalance ?? 0, notes: dto.notes ?? null,
      },
    });
    await this.audit.logMutation(actorId, tenantId, 'BANK', 'BankAccount', account.id, 'CREATE', { bankName: account.bankName, accountNumber: account.accountNumber });
    return account;
  }

  async listAccounts(tenantId: string) {
    return this.prisma.bankAccount.findMany({ where: { tenantId, deletedAt: null }, orderBy: { bankName: 'asc' } });
  }

  async getAccount(tenantId: string, id: string) {
    const a = await this.prisma.bankAccount.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!a) throw new NotFoundException('Bank account not found');
    return a;
  }

  async updateAccount(tenantId: string, actorId: string, id: string, dto: UpdateBankAccountDto) {
    await this.getAccount(tenantId, id);
    const data: any = {};
    if (dto.bankName !== undefined) data.bankName = dto.bankName;
    if (dto.accountName !== undefined) data.accountName = dto.accountName;
    if (dto.accountNumber !== undefined) data.accountNumber = dto.accountNumber;
    if (dto.routingNumber !== undefined) data.routingNumber = dto.routingNumber;
    if (dto.swiftCode !== undefined) data.swiftCode = dto.swiftCode;
    if (dto.currencyCode !== undefined) data.currencyCode = dto.currencyCode;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.isDefault !== undefined) data.isDefault = dto.isDefault;
    if (dto.notes !== undefined) data.notes = dto.notes;
    const account = await this.prisma.bankAccount.update({ where: { id }, data });
    await this.audit.logMutation(actorId, tenantId, 'BANK', 'BankAccount', id, 'UPDATE', { changes: dto });
    return account;
  }

  async deleteAccount(tenantId: string, actorId: string, id: string) {
    await this.getAccount(tenantId, id);
    await this.prisma.bankAccount.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.logMutation(actorId, tenantId, 'BANK', 'BankAccount', id, 'DELETE', {});
    return { id, deleted: true };
  }

  async createRegister(tenantId: string, actorId: string, dto: CreateCashRegisterDto) {
    const reg = await this.prisma.cashRegister.create({
      data: {
        tenantId, branchId: dto.branchId ?? null,
        name: dto.name, currencyCode: dto.currencyCode ?? 'USD',
        openingBalance: dto.openingBalance ?? 0, currentBalance: dto.openingBalance ?? 0,
        notes: dto.notes ?? null,
      },
    });
    await this.audit.logMutation(actorId, tenantId, 'BANK', 'CashRegister', reg.id, 'CREATE', { name: reg.name });
    return reg;
  }

  async listRegisters(tenantId: string) {
    return this.prisma.cashRegister.findMany({ where: { tenantId, deletedAt: null }, orderBy: { name: 'asc' } });
  }

  async getRegister(tenantId: string, id: string) {
    const r = await this.prisma.cashRegister.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!r) throw new NotFoundException('Cash register not found');
    return r;
  }

  async updateRegister(tenantId: string, actorId: string, id: string, dto: UpdateCashRegisterDto) {
    await this.getRegister(tenantId, id);
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.currencyCode !== undefined) data.currencyCode = dto.currencyCode;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.notes !== undefined) data.notes = dto.notes;
    const reg = await this.prisma.cashRegister.update({ where: { id }, data });
    await this.audit.logMutation(actorId, tenantId, 'BANK', 'CashRegister', id, 'UPDATE', { changes: dto });
    return reg;
  }

  async deleteRegister(tenantId: string, actorId: string, id: string) {
    await this.getRegister(tenantId, id);
    await this.prisma.cashRegister.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.logMutation(actorId, tenantId, 'BANK', 'CashRegister', id, 'DELETE', {});
    return { id, deleted: true };
  }

  async deposit(tenantId: string, actorId: string, registerId: string, amount: number, notes?: string) {
    const register = await this.getRegister(tenantId, registerId);
    const updated = await this.prisma.cashRegister.update({
      where: { id: registerId },
      data: { currentBalance: { increment: amount } },
    });
    await this.audit.logMutation(actorId, tenantId, 'BANK', 'CashRegister', registerId, 'UPDATE', {
      action: 'DEPOSIT', amount, previousBalance: Number(register.currentBalance), newBalance: Number(updated.currentBalance), notes,
    });
    return updated;
  }

  async withdraw(tenantId: string, actorId: string, registerId: string, amount: number, notes?: string) {
    const register = await this.getRegister(tenantId, registerId);
    if (Number(register.currentBalance) < amount) throw new BadRequestException('Insufficient balance');
    const updated = await this.prisma.cashRegister.update({
      where: { id: registerId },
      data: { currentBalance: { decrement: amount } },
    });
    await this.audit.logMutation(actorId, tenantId, 'BANK', 'CashRegister', registerId, 'UPDATE', {
      action: 'WITHDRAW', amount, previousBalance: Number(register.currentBalance), newBalance: Number(updated.currentBalance), notes,
    });
    return updated;
  }
}
