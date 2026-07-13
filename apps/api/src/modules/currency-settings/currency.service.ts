import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCurrencyDto, UpdateCurrencyDto } from './dto/currency.dto';

@Injectable()
export class CurrencyService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateCurrencyDto) {
    return this.prisma.currencyConfig.create({
      data: { tenantId, code: dto.code, name: dto.name, symbol: dto.symbol, exchangeRate: dto.exchangeRate ?? 1, isDefault: dto.isDefault ?? false, decimalPlaces: dto.decimalPlaces ?? 2 },
    });
  }

  async list(tenantId: string) {
    return this.prisma.currencyConfig.findMany({ where: { tenantId }, orderBy: [{ isDefault: 'desc' }, { code: 'asc' }] });
  }

  async getDefault(tenantId: string) {
    return this.prisma.currencyConfig.findFirst({ where: { tenantId, isDefault: true, isActive: true } });
  }

  async update(tenantId: string, id: string, dto: UpdateCurrencyDto) {
    const c = await this.prisma.currencyConfig.findFirst({ where: { id, tenantId } });
    if (!c) throw new NotFoundException('Currency not found');
    return this.prisma.currencyConfig.update({ where: { id }, data: dto as any });
  }

  async remove(tenantId: string, id: string) {
    await this.prisma.currencyConfig.findFirstOrThrow({ where: { id, tenantId } });
    return this.prisma.currencyConfig.update({ where: { id }, data: { isActive: false } });
  }
}
