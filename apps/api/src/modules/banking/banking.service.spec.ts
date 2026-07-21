import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BankingService } from './banking.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

describe('BankingService', () => {
  let service: BankingService;
  let prisma: any;
  const mockAudit = { logMutation: jest.fn().mockResolvedValue({}) };
  const tenantId = 'tenant-1';
  const actorId = 'user-1';

  beforeEach(async () => {
    prisma = {
      cashRegister: {
        findFirst: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
      },
      bankAccount: {
        findFirst: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankingService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<BankingService>(BankingService);
  });

  describe('deposit', () => {
    it('increments cash register balance', async () => {
      prisma.cashRegister.findFirst.mockResolvedValue({ id: 'reg-1', currentBalance: 100, tenantId });
      prisma.cashRegister.update.mockResolvedValue({ id: 'reg-1', currentBalance: 250 });

      const result = await service.deposit(tenantId, actorId, 'reg-1', 150, 'Daily deposit');
      expect(result.currentBalance).toBe(250);
      expect(mockAudit.logMutation).toHaveBeenCalled();
    });

    it('throws if register not found', async () => {
      prisma.cashRegister.findFirst.mockResolvedValue(null);
      await expect(service.deposit(tenantId, actorId, 'bad-id', 100)).rejects.toThrow(NotFoundException);
    });
  });

  describe('withdraw', () => {
    it('decrements cash register balance', async () => {
      prisma.cashRegister.findFirst.mockResolvedValue({ id: 'reg-1', currentBalance: 500, tenantId });
      prisma.cashRegister.update.mockResolvedValue({ id: 'reg-1', currentBalance: 400 });

      const result = await service.withdraw(tenantId, actorId, 'reg-1', 100, 'Petty cash');
      expect(result.currentBalance).toBe(400);
      expect(mockAudit.logMutation).toHaveBeenCalled();
    });

    it('throws on insufficient balance', async () => {
      prisma.cashRegister.findFirst.mockResolvedValue({ id: 'reg-1', currentBalance: 50, tenantId });
      await expect(service.withdraw(tenantId, actorId, 'reg-1', 100)).rejects.toThrow(BadRequestException);
    });
  });
});
