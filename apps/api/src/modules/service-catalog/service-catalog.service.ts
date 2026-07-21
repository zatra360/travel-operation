import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto, CreateItemDto, UpdateItemDto } from './dto/service-catalog.dto';

@Injectable()
export class ServiceCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async createCategory(tenantId: string, dto: CreateCategoryDto) {
    return this.prisma.serviceCategory.create({
      data: { tenantId, name: dto.name, code: dto.code, description: dto.description, icon: dto.icon, sortOrder: dto.sortOrder ?? 0 },
    });
  }

  async listCategories(tenantId: string) {
    return this.prisma.serviceCategory.findMany({ where: { tenantId }, include: { items: true }, orderBy: { sortOrder: 'asc' } });
  }

  async createItem(tenantId: string, dto: CreateItemDto) {
    return this.prisma.serviceItem.create({
      data: {
        tenantId, name: dto.name, code: dto.code, description: dto.description,
        categoryId: dto.categoryId, serviceType: dto.serviceType,
        basePrice: dto.basePrice ?? 0, currencyCode: dto.currencyCode ?? 'USD',
        isTaxable: dto.isTaxable ?? true, sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async listItems(tenantId: string, categoryId?: string) {
    return this.prisma.serviceItem.findMany({
      where: { tenantId, ...(categoryId ? { categoryId } : {}) },
      include: { category: { select: { id: true, name: true } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async updateItem(tenantId: string, id: string, dto: UpdateItemDto) {
    const item = await this.prisma.serviceItem.findFirst({ where: { id, tenantId } });
    if (!item) throw new NotFoundException('Service item not found');
    return this.prisma.serviceItem.update({ where: { id }, data: dto as any });
  }

  async deleteItem(tenantId: string, id: string) {
    await this.prisma.serviceItem.findFirstOrThrow({ where: { id, tenantId } });
    return this.prisma.serviceItem.update({ where: { id }, data: { isActive: false } });
  }
}
