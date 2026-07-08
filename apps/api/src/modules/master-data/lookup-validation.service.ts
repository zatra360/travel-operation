import { Injectable, BadRequestException } from '@nestjs/common';
import { MasterDataService } from '../master-data/master-data.service';

@Injectable()
export class LookupValidationService {
  constructor(private readonly masterData: MasterDataService) {}

  async validate(tenantId: string, categoryCode: string, code: string, branchId?: string) {
    if (!code) return;
    const items = await this.masterData.getEffectiveData({ tenantId, branchId, categoryCode });
    const item = items.find((i) => i.code === code);
    if (!item) throw new BadRequestException(`Invalid ${categoryCode}: "${code}" is not a valid option`);
    if (!item.isActive) throw new BadRequestException(`Invalid ${categoryCode}: "${code}" is not currently active`);
    return item;
  }

  async validateOptional(tenantId: string, categoryCode: string, code?: string | null, branchId?: string) {
    if (!code) return;
    return this.validate(tenantId, categoryCode, code, branchId);
  }

  async validateMultiple(tenantId: string, validations: { categoryCode: string; code?: string | null; branchId?: string }[]) {
    for (const v of validations) {
      if (v.code) await this.validate(tenantId, v.categoryCode, v.code, v.branchId);
    }
  }
}
