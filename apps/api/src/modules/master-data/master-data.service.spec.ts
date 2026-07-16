import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MasterDataService } from './master-data.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('MasterDataService', () => {
  let service: MasterDataService;
  let prisma: any;

  const mockCategory = (overrides: any = {}) => ({
    id: 'cat-1',
    code: 'lead-status',
    name: 'Lead Status',
    description: null,
    module: 'CRM',
    scope: 'GLOBAL',
    isSystem: false,
    isActive: true,
    sortOrder: 1,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  });

  const mockItem = (overrides: any = {}) => ({
    id: 'item-1',
    categoryId: 'cat-1',
    code: 'NEW',
    name: 'New',
    displayName: 'New Lead',
    description: null,
    color: '#3b82f6',
    icon: null,
    sortOrder: 0,
    isSystem: false,
    isActive: true,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      masterDataCategory: {
        findUnique: jest.fn().mockResolvedValue(mockCategory()),
        findMany: jest.fn().mockResolvedValue([mockCategory()]),
        create: jest.fn().mockResolvedValue(mockCategory()),
        update: jest.fn().mockResolvedValue(mockCategory()),
        count: jest.fn().mockResolvedValue(0),
      },
      masterDataItem: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(mockItem()),
        create: jest.fn().mockResolvedValue(mockItem()),
        update: jest.fn().mockResolvedValue(mockItem()),
        count: jest.fn().mockResolvedValue(0),
      },
      tenantMasterDataOverride: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MasterDataService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<MasterDataService>(MasterDataService);
  });

  describe('getEffectiveData', () => {
    it('returns global items when no overrides exist', async () => {
      const items = [
        mockItem({ code: 'NEW', name: 'New', color: '#3b82f6' }),
        mockItem({ id: 'item-2', code: 'WON', name: 'Won', color: '#22c55e' }),
      ];
      prisma.masterDataItem.findMany.mockResolvedValue(items);

      const result = await service.getEffectiveData({
        tenantId: 'tenant-1',
        categoryCode: 'lead-status',
      });

      expect(result).toHaveLength(2);
      expect(result[0].code).toBe('NEW');
      expect(result[0].source).toBe('GLOBAL');
      expect(result[1].code).toBe('WON');
      expect(result[1].source).toBe('GLOBAL');
    });

    it('returns empty array for non-existent category', async () => {
      prisma.masterDataCategory.findUnique.mockResolvedValue(null);

      const result = await service.getEffectiveData({
        tenantId: 'tenant-1',
        categoryCode: 'non-existent',
      });

      expect(result).toEqual([]);
    });

    it('filters inactive items by default', async () => {
      const items = [
        mockItem({ code: 'NEW', isActive: true }),
        mockItem({ id: 'item-2', code: 'OLD', isActive: false }),
      ];
      prisma.masterDataItem.findMany.mockResolvedValue(items);

      const result = await service.getEffectiveData({
        tenantId: 'tenant-1',
        categoryCode: 'lead-status',
      });

      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('NEW');
    });

    it('includes inactive items when includeInactive is true', async () => {
      const items = [
        mockItem({ code: 'NEW', isActive: true }),
        mockItem({ id: 'item-2', code: 'OLD', isActive: false }),
      ];
      prisma.masterDataItem.findMany.mockResolvedValue(items);

      const result = await service.getEffectiveData({
        tenantId: 'tenant-1',
        categoryCode: 'lead-status',
        includeInactive: true,
      });

      expect(result).toHaveLength(2);
    });

    it('filters out soft-deleted items via Prisma where clause', async () => {
      const items = [mockItem()];
      prisma.masterDataItem.findMany.mockResolvedValue(items);

      const result = await service.getEffectiveData({
        tenantId: 'tenant-1',
        categoryCode: 'lead-status',
      });

      expect(prisma.masterDataItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ deletedAt: null }) }),
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('getEffectiveData - tenant overrides', () => {
    beforeEach(() => {
      const items = [mockItem({ code: 'NEW', name: 'New', color: '#3b82f6' }), mockItem({ id: 'item-2', code: 'WON', name: 'Won', color: '#22c55e' })];
      prisma.masterDataItem.findMany.mockResolvedValue(items);
    });

    it('applies display name override from tenant', async () => {
      prisma.tenantMasterDataOverride.findMany.mockResolvedValue([
        { categoryCode: 'lead-status', code: 'NEW', displayName: 'Fresh Lead', color: null, icon: null,
          sortOrder: 0, isHidden: false, isCustom: false, isActive: true, name: 'New', branchId: null },
      ]);

      const result = await service.getEffectiveData({ tenantId: 'tenant-1', categoryCode: 'lead-status' });

      expect(result[0].displayName).toBe('Fresh Lead');
      expect(result[0].source).toBe('TENANT_OVERRIDE');
    });

    it('applies color override from tenant', async () => {
      prisma.tenantMasterDataOverride.findMany.mockResolvedValue([
        { categoryCode: 'lead-status', code: 'NEW', displayName: null, color: '#ff0000', icon: null,
          sortOrder: 0, isHidden: false, isCustom: false, isActive: true, name: 'New', branchId: null },
      ]);

      const result = await service.getEffectiveData({ tenantId: 'tenant-1', categoryCode: 'lead-status' });

      expect(result[0].color).toBe('#ff0000');
    });

    it('hides item flagged by tenant', async () => {
      prisma.tenantMasterDataOverride.findMany.mockResolvedValue([
        { categoryCode: 'lead-status', code: 'NEW', displayName: null, color: null, icon: null,
          sortOrder: 0, isHidden: true, isCustom: false, isActive: true, name: 'New', branchId: null },
      ]);

      const result = await service.getEffectiveData({ tenantId: 'tenant-1', categoryCode: 'lead-status' });

      expect(result.find((i) => i.code === 'NEW')).toBeUndefined();
      expect(result).toHaveLength(1);
    });

    it('adds custom item from tenant', async () => {
      prisma.tenantMasterDataOverride.findMany.mockResolvedValue([
        { categoryCode: 'lead-status', code: 'VIP', displayName: 'VIP Lead', color: '#gold', icon: 'star',
          sortOrder: 5, isHidden: false, isCustom: true, isActive: true, name: 'VIP Lead', branchId: null },
      ]);

      const result = await service.getEffectiveData({ tenantId: 'tenant-1', categoryCode: 'lead-status' });

      const vipItem = result.find((i) => i.code === 'VIP');
      expect(vipItem).toBeDefined();
      expect(vipItem!.isCustom).toBe(true);
      expect(vipItem!.source).toBe('TENANT');
      expect(result).toHaveLength(3);
    });
  });

  describe('getEffectiveData - branch overrides', () => {
    beforeEach(() => {
      const items = [mockItem({ code: 'NEW', name: 'New', color: '#3b82f6' })];
      prisma.masterDataItem.findMany.mockResolvedValue(items);
    });

    it('hides item at branch level', async () => {
      prisma.tenantMasterDataOverride.findMany.mockResolvedValue([
        { categoryCode: 'lead-status', code: 'NEW', displayName: null, color: null, icon: null,
          sortOrder: 0, isHidden: true, isCustom: false, isActive: true, name: 'New', branchId: 'branch-1' },
      ]);

      const result = await service.getEffectiveData({
        tenantId: 'tenant-1',
        branchId: 'branch-1',
        categoryCode: 'lead-status',
      });

      expect(result).toHaveLength(0);
    });

    it('branch override takes precedence over tenant override', async () => {
      prisma.tenantMasterDataOverride.findMany.mockResolvedValue([
        { categoryCode: 'lead-status', code: 'NEW', displayName: 'Tenant Label', color: '#000', icon: null,
          sortOrder: 0, isHidden: false, isCustom: false, isActive: true, name: 'New', branchId: null },
        { categoryCode: 'lead-status', code: 'NEW', displayName: 'Branch Label', color: '#fff', icon: null,
          sortOrder: 0, isHidden: false, isCustom: false, isActive: true, name: 'New', branchId: 'branch-1' },
      ]);

      const result = await service.getEffectiveData({
        tenantId: 'tenant-1',
        branchId: 'branch-1',
        categoryCode: 'lead-status',
      });

      expect(result[0].displayName).toBe('Branch Label');
      expect(result[0].color).toBe('#fff');
      expect(result[0].source).toBe('BRANCH_OVERRIDE');
    });
  });

  describe('CRUD - Categories', () => {
    it('getCategories filters deletedAt', async () => {
      await service.getCategories();
      expect(prisma.masterDataCategory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: null } }),
      );
    });

    it('createCategory delegates to prisma', async () => {
      const dto = { code: 'test-cat', name: 'Test Category', module: 'CRM' } as any;
      await service.createCategory(dto);
      expect(prisma.masterDataCategory.create).toHaveBeenCalledWith({ data: dto });
    });

    it('updateCategory delegates to prisma', async () => {
      await service.updateCategory('cat-1', { name: 'Updated' });
      expect(prisma.masterDataCategory.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'cat-1' } }),
      );
    });

    it('deleteCategory performs soft delete', async () => {
      await service.deleteCategory('cat-1');
      expect(prisma.masterDataCategory.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cat-1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date), isActive: false }),
        }),
      );
    });
  });

  describe('CRUD - Items', () => {
    it('getItems filters deletedAt and supports pagination', async () => {
      prisma.masterDataItem.findMany.mockResolvedValue([mockItem()]);
      prisma.masterDataItem.count.mockResolvedValue(1);

      const result = await service.getItems('cat-1', { search: 'new', page: 1, limit: 10 });

      expect(prisma.masterDataItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null }),
        }),
      );
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });

    it('getItems supports text search', async () => {
      prisma.masterDataItem.findMany.mockResolvedValue([]);
      prisma.masterDataItem.count.mockResolvedValue(0);

      await service.getItems('cat-1', { search: 'won', page: 1, limit: 25 });

      expect(prisma.masterDataItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { name: expect.objectContaining({ contains: 'won' }) },
              { code: expect.objectContaining({ contains: 'won' }) },
            ]),
          }),
        }),
      );
    });

    it('createItem includes categoryId in data', async () => {
      const dto = { code: 'TEST', name: 'Test Item' } as any;
      await service.createItem('cat-1', dto);
      expect(prisma.masterDataItem.create).toHaveBeenCalledWith({
        data: { code: 'TEST', name: 'Test Item', categoryId: 'cat-1' },
      });
    });

    it('deleteItem performs soft delete', async () => {
      await service.deleteItem('item-1');
      expect(prisma.masterDataItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'item-1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date), isActive: false }),
        }),
      );
    });
  });

  describe('Tenant Overrides', () => {
    it('upsertTenantOverride creates when not exists', async () => {
      prisma.tenantMasterDataOverride.findFirst.mockResolvedValue(null);

      await service.upsertTenantOverride('tenant-1', 'user-1', {
        categoryCode: 'lead-status',
        code: 'NEW',
        displayName: 'Custom Name',
        color: '#custom',
      });

      expect(prisma.tenantMasterDataOverride.create).toHaveBeenCalled();
    });

    it('upsertTenantOverride updates when exists', async () => {
      prisma.tenantMasterDataOverride.findFirst.mockResolvedValue({ id: 'override-1' });

      await service.upsertTenantOverride('tenant-1', 'user-1', {
        categoryCode: 'lead-status',
        code: 'NEW',
        displayName: 'Updated Name',
      });

      expect(prisma.tenantMasterDataOverride.update).toHaveBeenCalled();
    });

    it('hideItem sets isHidden: true', async () => {
      prisma.tenantMasterDataOverride.findFirst.mockResolvedValue(null);
      await service.hideItem('tenant-1', 'user-1', 'lead-status', 'NEW');
      expect(prisma.tenantMasterDataOverride.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isHidden: true }) }),
      );
    });

    it('restoreItem sets isHidden: false', async () => {
      prisma.tenantMasterDataOverride.findFirst.mockResolvedValue(null);
      await service.restoreItem('tenant-1', 'user-1', 'lead-status', 'NEW');
      expect(prisma.tenantMasterDataOverride.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isHidden: false }) }),
      );
    });

    it('deleteTenantOverride performs soft delete', async () => {
      prisma.tenantMasterDataOverride.findFirst.mockResolvedValue({ id: 'ov-1' });
      await service.deleteTenantOverride('tenant-1', 'lead-status', 'NEW');
      expect(prisma.tenantMasterDataOverride.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { deletedAt: expect.any(Date) } }),
      );
    });

    it('deleteTenantOverride returns early when override not found', async () => {
      prisma.tenantMasterDataOverride.findFirst.mockResolvedValue(null);
      const result = await service.deleteTenantOverride('tenant-1', 'lead-status', 'NONEXISTENT');
      expect(result).toBeUndefined();
    });
  });

  describe('Reference Data', () => {
    it('listCountries supports pagination and search', async () => {
      prisma.country = { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) };
      const result = await service.listCountries(1, 20, 'united');
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('getCountry throws NotFoundException when not found', async () => {
      prisma.country = { findUnique: jest.fn().mockResolvedValue(null) };
      await expect(service.getCountry('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
