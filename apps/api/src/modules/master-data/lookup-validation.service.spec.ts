import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { LookupValidationService } from './lookup-validation.service';
import { MasterDataService } from './master-data.service';

describe('LookupValidationService', () => {
  let service: LookupValidationService;
  let masterData: any;

  beforeEach(async () => {
    masterData = {
      getEffectiveData: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LookupValidationService,
        { provide: MasterDataService, useValue: masterData },
      ],
    }).compile();

    service = module.get<LookupValidationService>(LookupValidationService);
  });

  describe('validate', () => {
    it('passes when code exists and is active', async () => {
      masterData.getEffectiveData.mockResolvedValue([
        { code: 'NEW', name: 'New', isActive: true },
      ]);

      const result = await service.validate('tenant-1', 'lead-status', 'NEW');
      expect(result).toBeDefined();
      expect(result!.code).toBe('NEW');
    });

    it('throws BadRequestException when code does not exist', async () => {
      masterData.getEffectiveData.mockResolvedValue([
        { code: 'WON', name: 'Won', isActive: true },
      ]);

      await expect(
        service.validate('tenant-1', 'lead-status', 'INVALID'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when code is inactive', async () => {
      masterData.getEffectiveData.mockResolvedValue([
        { code: 'OLD', name: 'Old', isActive: false },
      ]);

      await expect(
        service.validate('tenant-1', 'lead-status', 'OLD'),
      ).rejects.toThrow(BadRequestException);
    });

    it('passes through branchId to getEffectiveData', async () => {
      masterData.getEffectiveData.mockResolvedValue([
        { code: 'NEW', name: 'New', isActive: true },
      ]);

      await service.validate('tenant-1', 'lead-status', 'NEW', 'branch-2');

      expect(masterData.getEffectiveData).toHaveBeenCalledWith({
        tenantId: 'tenant-1',
        branchId: 'branch-2',
        categoryCode: 'lead-status',
      });
    });
  });

  describe('validateOptional', () => {
    it('skips validation when code is undefined', async () => {
      const result = await service.validateOptional('tenant-1', 'lead-status', undefined);
      expect(result).toBeUndefined();
      expect(masterData.getEffectiveData).not.toHaveBeenCalled();
    });

    it('skips validation when code is null', async () => {
      const result = await service.validateOptional('tenant-1', 'lead-status', null);
      expect(result).toBeUndefined();
      expect(masterData.getEffectiveData).not.toHaveBeenCalled();
    });

    it('validates when code is provided', async () => {
      masterData.getEffectiveData.mockResolvedValue([
        { code: 'EMAIL', name: 'Email', isActive: true },
      ]);

      const result = await service.validateOptional('tenant-1', 'contact-method', 'EMAIL');
      expect(result).toBeDefined();
      expect(result!.code).toBe('EMAIL');
    });
  });

  describe('validateMultiple', () => {
    it('validates multiple codes', async () => {
      masterData.getEffectiveData.mockResolvedValue([
        { code: 'NEW', name: 'New', isActive: true },
        { code: 'HIGH', name: 'High', isActive: true },
      ]);

      await service.validateMultiple('tenant-1', [
        { categoryCode: 'lead-status', code: 'NEW' },
        { categoryCode: 'lead-priority', code: 'HIGH' },
      ]);

      expect(masterData.getEffectiveData).toHaveBeenCalledTimes(2);
    });

    it('skips empty codes', async () => {
      masterData.getEffectiveData.mockResolvedValue([{ code: 'NEW', name: 'New', isActive: true }]);

      await service.validateMultiple('tenant-1', [
        { categoryCode: 'lead-status', code: 'NEW' },
        { categoryCode: 'lead-source', code: undefined },
        { categoryCode: 'service-type', code: null },
      ]);

      expect(masterData.getEffectiveData).toHaveBeenCalledTimes(1);
    });

    it('throws on first invalid code', async () => {
      masterData.getEffectiveData.mockResolvedValue([
        { code: 'NEW', name: 'New', isActive: true },
      ]);

      await expect(
        service.validateMultiple('tenant-1', [
          { categoryCode: 'lead-status', code: 'NEW' },
          { categoryCode: 'lead-priority', code: 'INVALID' },
          { categoryCode: 'lead-source', code: 'WEB' },
        ]),
      ).rejects.toThrow(BadRequestException);

      expect(masterData.getEffectiveData).toHaveBeenCalledTimes(2);
    });
  });
});
