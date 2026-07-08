import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface EffectiveItem {
  code: string; name: string; displayName: string; color?: string | null;
  icon?: string | null; sortOrder: number; isCustom: boolean; source: string; isActive: boolean;
}

@Injectable()
export class MasterDataService {
  constructor(private readonly prisma: PrismaService) {}

  async getEffectiveData(params: {
    tenantId: string; branchId?: string; categoryCode: string; includeInactive?: boolean;
  }): Promise<EffectiveItem[]> {
    const { tenantId, branchId, categoryCode } = params;
    const category = await this.prisma.masterDataCategory.findUnique({ where: { code: categoryCode } });
    if (!category) return [];

    const items = await this.prisma.masterDataItem.findMany({
      where: { categoryId: category.id, ...(params.includeInactive ? {} : { isActive: true }) },
      orderBy: { sortOrder: 'asc' },
    });

    const overrides = await this.prisma.tenantMasterDataOverride.findMany({
      where: { tenantId, categoryCode, deletedAt: null },
    });

    const branchOverrides = branchId
      ? overrides.filter((o) => o.branchId === branchId)
      : [];
    const tenantOverrides = overrides.filter((o) => !o.branchId);

    const result = new Map<string, EffectiveItem>();

    for (const item of items) {
      result.set(item.code, {
        code: item.code, name: item.name, displayName: item.displayName || item.name,
        color: item.color, icon: item.icon, sortOrder: item.sortOrder,
        isCustom: false, source: 'GLOBAL', isActive: item.isActive,
      });
    }

    for (const ov of tenantOverrides) {
      if (ov.isCustom) {
        result.set(ov.code, {
          code: ov.code, name: ov.name, displayName: ov.displayName || ov.name,
          color: ov.color, icon: ov.icon, sortOrder: ov.sortOrder,
          isCustom: true, source: 'TENANT', isActive: ov.isActive,
        });
      } else if (ov.isHidden) {
        result.delete(ov.code);
      } else if (result.has(ov.code)) {
        const existing = result.get(ov.code)!;
        result.set(ov.code, {
          ...existing,
          displayName: ov.displayName || ov.name || existing.displayName,
          color: ov.color ?? existing.color, icon: ov.icon ?? existing.icon,
          sortOrder: ov.sortOrder ?? existing.sortOrder,
          source: 'TENANT_OVERRIDE',
        });
      }
    }

    for (const ov of branchOverrides) {
      if (ov.isHidden) { result.delete(ov.code); continue; }
      const existing = result.get(ov.code);
      const base = existing || {
        code: ov.code, name: ov.name, displayName: ov.displayName || ov.name,
        color: ov.color, icon: ov.icon, sortOrder: ov.sortOrder,
        isCustom: false, source: 'BRANCH', isActive: ov.isActive,
      };
      result.set(ov.code, {
        ...base, displayName: ov.displayName || ov.name || base.displayName,
        color: ov.color ?? base.color, icon: ov.icon ?? base.icon,
        sortOrder: ov.sortOrder ?? base.sortOrder,
        source: existing ? 'BRANCH_OVERRIDE' : 'BRANCH',
      });
    }

    return Array.from(result.values())
      .filter((i) => params.includeInactive || i.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async getEffectiveForCategories(params: {
    tenantId: string; branchId?: string; categoryCodes: string[]; includeInactive?: boolean;
  }): Promise<Record<string, EffectiveItem[]>> {
    const result: Record<string, EffectiveItem[]> = {};
    for (const code of params.categoryCodes) {
      result[code] = await this.getEffectiveData({ ...params, categoryCode: code });
    }
    return result;
  }

  async getCategories() { return this.prisma.masterDataCategory.findMany({ orderBy: { sortOrder: 'asc' }, include: { _count: { select: { items: true } } } }); }
  async getCategory(id: string) { return this.prisma.masterDataCategory.findUnique({ where: { id } }); }
  async createCategory(data: any) { return this.prisma.masterDataCategory.create({ data }); }
  async updateCategory(id: string, data: any) { return this.prisma.masterDataCategory.update({ where: { id }, data }); }
  async deleteCategory(id: string) { return this.prisma.masterDataCategory.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } }); }

  async getItems(categoryId: string) { return this.prisma.masterDataItem.findMany({ where: { categoryId }, orderBy: { sortOrder: 'asc' } }); }
  async getItem(id: string) { return this.prisma.masterDataItem.findUnique({ where: { id } }); }
  async createItem(categoryId: string, data: any) { return this.prisma.masterDataItem.create({ data: { ...data, categoryId } }); }
  async updateItem(id: string, data: any) { return this.prisma.masterDataItem.update({ where: { id }, data }); }
  async deleteItem(id: string) { return this.prisma.masterDataItem.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } }); }

  // Tenant overrides
  async getTenantOverrides(tenantId: string, categoryCode: string) {
    return this.prisma.tenantMasterDataOverride.findMany({ where: { tenantId, categoryCode, deletedAt: null } });
  }

  async upsertTenantOverride(tenantId: string, actorId: string, data: {
    branchId?: string; categoryCode: string; code: string; displayName?: string;
    color?: string; icon?: string; sortOrder?: number; isHidden?: boolean; isCustom?: boolean;
  }) {
    const existing = await this.prisma.tenantMasterDataOverride.findFirst({
      where: { tenantId, branchId: data.branchId ?? null, categoryCode: data.categoryCode, code: data.code },
    });
    if (existing) {
      return this.prisma.tenantMasterDataOverride.update({
        where: { id: existing.id },
        data: { ...data, updatedById: actorId },
      });
    }
    return this.prisma.tenantMasterDataOverride.create({
      data: { tenantId, branchId: data.branchId ?? null, categoryCode: data.categoryCode, code: data.code,
        name: data.displayName || data.code, displayName: data.displayName, color: data.color,
        icon: data.icon, sortOrder: data.sortOrder ?? 0, isCustom: data.isCustom ?? false,
        isHidden: data.isHidden ?? false, createdById: actorId },
    });
  }

  async hideItem(tenantId: string, actorId: string, categoryCode: string, code: string, branchId?: string) {
    return this.upsertTenantOverride(tenantId, actorId, { branchId, categoryCode, code, isHidden: true });
  }

  async restoreItem(tenantId: string, actorId: string, categoryCode: string, code: string, branchId?: string) {
    return this.upsertTenantOverride(tenantId, actorId, { branchId, categoryCode, code, isHidden: false });
  }

  async deleteTenantOverride(tenantId: string, categoryCode: string, code: string, branchId?: string) {
    const ov = await this.prisma.tenantMasterDataOverride.findFirst({
      where: { tenantId, branchId: branchId ?? null, categoryCode, code },
    });
    if (!ov) return;
    return this.prisma.tenantMasterDataOverride.update({ where: { id: ov.id }, data: { deletedAt: new Date() } });
  }

  // ── Reference Data ──
  async listCountries(page = 1, limit = 50, search?: string) {
    const skip = (page - 1) * limit; const where: any = {}; if (search) where.name = { contains: search, mode: 'insensitive' };
    const [data, total] = await Promise.all([this.prisma.country.findMany({ where, orderBy: { name: 'asc' }, skip, take: limit }), this.prisma.country.count({ where })]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
  async getCountry(id: string) { const c = await this.prisma.country.findUnique({ where: { id } }); if (!c) throw new NotFoundException(); return c; }
  async listNationalities(page = 1, limit = 50, countryId?: string) {
    const skip = (page - 1) * limit; const where: any = {}; if (countryId) where.countryId = countryId;
    const [data, total] = await Promise.all([this.prisma.nationality.findMany({ where, orderBy: { name: 'asc' }, skip, take: limit }), this.prisma.nationality.count({ where })]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
  async listCurrencies(page = 1, limit = 50, search?: string) {
    const skip = (page - 1) * limit; const where: any = {}; if (search) where.OR = [{ code: { contains: search, mode: 'insensitive' } }, { name: { contains: search, mode: 'insensitive' } }];
    const [data, total] = await Promise.all([this.prisma.currency.findMany({ where, orderBy: { code: 'asc' }, skip, take: limit }), this.prisma.currency.count({ where })]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
  async listAirlines(page = 1, limit = 50, search?: string) {
    const skip = (page - 1) * limit; const where: any = {}; if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { iataCode: { contains: search, mode: 'insensitive' } }];
    const [data, total] = await Promise.all([this.prisma.airline.findMany({ where, orderBy: { name: 'asc' }, skip, take: limit }), this.prisma.airline.count({ where })]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
  async listAirports(page = 1, limit = 50, search?: string) {
    const skip = (page - 1) * limit; const where: any = {}; if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { iataCode: { contains: search, mode: 'insensitive' } }, { city: { contains: search, mode: 'insensitive' } }];
    const [data, total] = await Promise.all([this.prisma.airport.findMany({ where, orderBy: { name: 'asc' }, skip, take: limit }), this.prisma.airport.count({ where })]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
