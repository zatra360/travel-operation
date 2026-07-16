import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SYSTEM_SERVICE_TYPES } from './templates/system-templates';
import { ConfigureServiceTypeDto } from './dto/service-type.dto';

@Injectable()
export class ServiceTypeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Idempotently creates the 12 immutable system service types. */
  async ensureSystemTypes() {
    for (const def of SYSTEM_SERVICE_TYPES) {
      await this.prisma.serviceType.upsert({
        where: { systemCode: def.systemCode },
        update: {},
        create: {
          systemCode: def.systemCode,
          displayName: def.displayName,
          slug: def.slug,
          icon: def.icon,
          category: def.category,
          displayOrder: def.displayOrder,
          isSystem: true,
          supportsTicketing: def.supportsTicketing ?? false,
          supportsApplication: def.supportsApplication ?? false,
        },
      });
    }
  }

  /** Global types merged with the tenant's configuration overlay. */
  async listForTenant(tenantId: string, includeDisabled = false) {
    await this.ensureSystemTypes();
    const [types, configs] = await Promise.all([
      this.prisma.serviceType.findMany({ orderBy: { displayOrder: 'asc' } }),
      this.prisma.tenantServiceTypeConfig.findMany({ where: { tenantId } }),
    ]);
    const configMap = new Map(configs.map((c) => [c.serviceTypeId, c]));

    const merged = types.map((t) => {
      const config = configMap.get(t.id);
      return {
        id: t.id,
        systemCode: t.systemCode,
        slug: t.slug,
        category: t.category,
        isSystem: t.isSystem,
        displayName: config?.displayName ?? t.displayName,
        icon: config?.icon ?? t.icon,
        displayOrder: config?.displayOrder ?? t.displayOrder,
        isEnabled: config?.isEnabled ?? true,
        supportsLead: t.supportsLead,
        supportsQuotation: t.supportsQuotation,
        supportsBooking: t.supportsBooking,
        supportsApplication: t.supportsApplication,
        supportsTicketing: t.supportsTicketing,
        supportsSupplier: t.supportsSupplier,
        supportsInvoice: t.supportsInvoice,
        supportsPayment: t.supportsPayment,
        supportsAfterSales: t.supportsAfterSales,
        defaultBranchId: config?.defaultBranchId ?? null,
        defaultTeamId: config?.defaultTeamId ?? null,
        defaultAssigneeId: config?.defaultAssigneeId ?? null,
        defaultWorkflowTemplateId: config?.defaultWorkflowTemplateId ?? null,
        configuration: config?.configuration ?? t.configuration,
      };
    });

    const filtered = includeDisabled ? merged : merged.filter((t) => t.isEnabled);
    return filtered.sort((a, b) => a.displayOrder - b.displayOrder);
  }

  async findBySystemCode(systemCode: string) {
    await this.ensureSystemTypes();
    const type = await this.prisma.serviceType.findUnique({ where: { systemCode } });
    if (!type) throw new NotFoundException(`Service type ${systemCode} not found`);
    return type;
  }

  async resolveEnabledType(tenantId: string, systemCode: string) {
    const type = await this.findBySystemCode(systemCode);
    const config = await this.prisma.tenantServiceTypeConfig.findUnique({
      where: { tenantId_serviceTypeId: { tenantId, serviceTypeId: type.id } },
    });
    if (config && !config.isEnabled) {
      throw new BadRequestException(`Service type ${systemCode} is disabled for this tenant`);
    }
    return { type, config };
  }

  async configure(tenantId: string, actorId: string, systemCode: string, dto: ConfigureServiceTypeDto) {
    const type = await this.findBySystemCode(systemCode);

    if (dto.defaultTeamId) {
      const team = await this.prisma.team.findFirst({ where: { id: dto.defaultTeamId, tenantId } });
      if (!team) throw new BadRequestException('Default team does not belong to this tenant');
    }
    if (dto.defaultWorkflowTemplateId) {
      const template = await this.prisma.workflowTemplate.findFirst({
        where: {
          id: dto.defaultWorkflowTemplateId,
          serviceTypeId: type.id,
          status: 'PUBLISHED',
          OR: [{ tenantId }, { tenantId: null, isSystem: true }],
        },
      });
      if (!template) throw new BadRequestException('Default workflow template must be a published template for this service type');
    }

    const before = await this.prisma.tenantServiceTypeConfig.findUnique({
      where: { tenantId_serviceTypeId: { tenantId, serviceTypeId: type.id } },
    });

    const config = await this.prisma.tenantServiceTypeConfig.upsert({
      where: { tenantId_serviceTypeId: { tenantId, serviceTypeId: type.id } },
      update: {
        ...(dto.isEnabled !== undefined && { isEnabled: dto.isEnabled }),
        ...(dto.displayName !== undefined && { displayName: dto.displayName }),
        ...(dto.icon !== undefined && { icon: dto.icon }),
        ...(dto.displayOrder !== undefined && { displayOrder: dto.displayOrder }),
        ...(dto.defaultBranchId !== undefined && { defaultBranchId: dto.defaultBranchId }),
        ...(dto.defaultTeamId !== undefined && { defaultTeamId: dto.defaultTeamId }),
        ...(dto.defaultAssigneeId !== undefined && { defaultAssigneeId: dto.defaultAssigneeId }),
        ...(dto.defaultWorkflowTemplateId !== undefined && { defaultWorkflowTemplateId: dto.defaultWorkflowTemplateId }),
        ...(dto.configuration !== undefined && { configuration: dto.configuration as any }),
      },
      create: {
        tenantId,
        serviceTypeId: type.id,
        isEnabled: dto.isEnabled ?? true,
        displayName: dto.displayName,
        icon: dto.icon,
        displayOrder: dto.displayOrder,
        defaultBranchId: dto.defaultBranchId,
        defaultTeamId: dto.defaultTeamId,
        defaultAssigneeId: dto.defaultAssigneeId,
        defaultWorkflowTemplateId: dto.defaultWorkflowTemplateId,
        configuration: dto.configuration as any,
      },
    });

    await this.audit.logMutation(actorId, tenantId, 'SERVICE_TYPE', 'TenantServiceTypeConfig', config.id, 'UPDATE', {
      systemCode,
      before: before ? { isEnabled: before.isEnabled, displayName: before.displayName } : null,
      after: { isEnabled: config.isEnabled, displayName: config.displayName },
    });

    return config;
  }
}
