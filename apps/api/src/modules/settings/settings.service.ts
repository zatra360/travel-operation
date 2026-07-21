import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(tenantId: string, key: string) {
    const setting = await this.prisma.tenantSetting.findUnique({
      where: { tenantId_key: { tenantId, key } },
    });
    return setting?.value || null;
  }

  async set(tenantId: string, key: string, value: any) {
    return this.prisma.tenantSetting.upsert({
      where: { tenantId_key: { tenantId, key } },
      update: { value },
      create: { tenantId, key, value },
    });
  }

  async getAll(tenantId: string) {
    const settings = await this.prisma.tenantSetting.findMany({
      where: { tenantId },
    });

    const result: Record<string, any> = {};
    for (const s of settings) {
      result[s.key] = s.value;
    }
    return result;
  }

  async delete(tenantId: string, key: string) {
    const setting = await this.prisma.tenantSetting.findUnique({
      where: { tenantId_key: { tenantId, key } },
    });
    if (!setting) throw new NotFoundException('Setting not found');
    await this.prisma.tenantSetting.delete({ where: { id: setting.id } });
  }

  async getCustomFields(tenantId: string) {
    const setting = await this.prisma.tenantSetting.findUnique({ where: { tenantId_key: { tenantId, key: 'custom_fields' } } });
    return (setting?.value as any[]) || [];
  }

  async addCustomField(tenantId: string, field: any) {
    const fields = await this.getCustomFields(tenantId);
    const newField = { id: Date.now().toString(36), ...field };
    fields.push(newField);
    await this.set(tenantId, 'custom_fields', fields);
    return newField;
  }

  async removeCustomField(tenantId: string, id: string) {
    const fields = await this.getCustomFields(tenantId);
    const updated = fields.filter((f: any) => f.id !== id);
    await this.set(tenantId, 'custom_fields', updated);
    return { success: true };
  }
}
