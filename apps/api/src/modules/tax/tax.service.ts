import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTaxRateDto, UpdateTaxRateDto } from './dto/tax.dto';

@Injectable()
export class TaxService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateTaxRateDto) {
    if (dto.isDefault) {
      await this.prisma.taxRate.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      });
    }
    return this.prisma.taxRate.create({
      data: { tenantId, name: dto.name, code: dto.code, rate: dto.rate, description: dto.description, countryCode: dto.countryCode, isDefault: dto.isDefault ?? false },
    });
  }

  async list(tenantId: string) {
    return this.prisma.taxRate.findMany({ where: { tenantId }, orderBy: { isDefault: 'desc' } });
  }

  async findOne(tenantId: string, id: string) {
    const r = await this.prisma.taxRate.findFirst({ where: { id, tenantId } });
    if (!r) throw new NotFoundException('Tax rate not found');
    return r;
  }

  async getDefault(tenantId: string) {
    return this.prisma.taxRate.findFirst({ where: { tenantId, isDefault: true, isActive: true } });
  }

  async update(tenantId: string, id: string, dto: UpdateTaxRateDto) {
    await this.findOne(tenantId, id);
    if ((dto as any).isDefault) {
      await this.prisma.taxRate.updateMany({
        where: { tenantId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }
    return this.prisma.taxRate.update({ where: { id }, data: dto as any });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.taxRate.update({ where: { id }, data: { isActive: false } });
  }
}
