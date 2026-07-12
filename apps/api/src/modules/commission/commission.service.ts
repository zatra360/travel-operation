import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { enforceBranchScope } from '../../common/utils/scope';
import { AuditService } from '../audit/audit.service';
import { ActivityService } from '../activity/activity.service';
import { RelationshipValidationService } from '../../common/services/relationship-validation.service';
import { validateStatusTransition } from '../../common/utils/status-transitions';
import { CreateCommissionDto } from './dto/create-commission.dto';
import { UpdateCommissionDto } from './dto/update-commission.dto';
import { QueryCommissionDto } from './dto/query-commission.dto';

@Injectable()
export class CommissionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly activity: ActivityService,
    private readonly relValidation: RelationshipValidationService,
  ) {}

  async create(tenantId: string, actorId: string, dto: CreateCommissionDto) {
    await this.relValidation.validateLinkedEntities({
      tenantId,
      employeeId: dto.employeeId,
      branchId: dto.branchId,
    });

    const commission = await this.prisma.commission.create({
      data: {
        tenantId,
        branchId: dto.branchId ?? null,
        employeeId: dto.employeeId,
        sourceType: dto.sourceType,
        sourceId: dto.sourceId ?? null,
        amount: dto.amount ?? 0,
        currencyCode: dto.currencyCode ?? 'USD',
        calculationBasis: dto.calculationBasis ?? null,
        status: 'PENDING',
        notes: dto.notes ?? null,
        createdById: actorId,
      },
    });

    await this.audit.logMutation(actorId, tenantId, 'COMMISSION', 'Commission', commission.id, 'CREATE', { employeeId: dto.employeeId, sourceType: dto.sourceType }, commission.branchId ?? undefined);
    await this.activity.logEntityEvent({
      tenantId, userId: actorId, type: 'COMMISSION_CREATED',
      subject: `Commission created for employee ${dto.employeeId}`,
      entity: 'Commission', entityId: commission.id, branchId: commission.branchId,
    });

    return commission;
  }

  async findAll(tenantId: string, query: QueryCommissionDto, activeBranchId?: string) {
    const page = query.page ?? 1; const limit = query.limit ?? 50; const skip = (page - 1) * limit;
    const where: any = { tenantId };
    if (query.status) where.status = query.status;
    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.branchId) where.branchId = query.branchId;
    if (query.search) {
      where.OR = [
        { employeeId: { contains: query.search, mode: 'insensitive' } },
        { sourceType: { contains: query.search, mode: 'insensitive' } },
        { notes: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    enforceBranchScope(where, activeBranchId);
    const [data, total] = await Promise.all([
      this.prisma.commission.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.prisma.commission.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(tenantId: string, id: string) {
    const commission = await this.prisma.commission.findFirst({ where: { id, tenantId } });
    if (!commission) throw new NotFoundException('Commission not found');
    return commission;
  }

  async update(tenantId: string, actorId: string, id: string, dto: UpdateCommissionDto) {
    const current = await this.findById(tenantId, id);

    await this.relValidation.validateLinkedEntities({
      tenantId,
      employeeId: dto.employeeId,
      branchId: dto.branchId,
    });

    const oldStatus = current.status;

    if (dto.status !== undefined && dto.status !== current.status) {
      const check = validateStatusTransition('commission', current.status, dto.status);
      if (!check.valid) {
        throw new BadRequestException(`Cannot transition from ${current.status} to ${dto.status}. Allowed: ${check.allowed.join(', ') || 'none'}`);
      }
    }

    const commission = await this.prisma.commission.update({
      where: { id },
      data: {
        ...(dto.employeeId !== undefined && { employeeId: dto.employeeId }),
        ...(dto.sourceType !== undefined && { sourceType: dto.sourceType }),
        ...(dto.sourceId !== undefined && { sourceId: dto.sourceId }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.currencyCode !== undefined && { currencyCode: dto.currencyCode }),
        ...(dto.calculationBasis !== undefined && { calculationBasis: dto.calculationBasis }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.branchId !== undefined && { branchId: dto.branchId }),
      },
    });

    if (dto.status && dto.status !== oldStatus) {
      await this.activity.logEntityEvent({
        tenantId, userId: actorId, type: 'COMMISSION_STATUS_CHANGED',
        subject: `Commission ${dto.employeeId}: ${oldStatus} -> ${dto.status}`,
        entity: 'Commission', entityId: id, branchId: commission.branchId,
      });
    }

    await this.audit.logMutation(actorId, tenantId, 'COMMISSION', 'Commission', id, dto.status !== oldStatus ? 'STATUS_CHANGE' : 'UPDATE', { changes: dto }, commission.branchId ?? undefined);

    return commission;
  }

  async approve(tenantId: string, actorId: string, id: string) {
    const current = await this.findById(tenantId, id);

    const check = validateStatusTransition('commission', current.status, 'APPROVED');
    if (!check.valid) {
      throw new BadRequestException(`Cannot approve commission in status ${current.status}. Allowed: ${check.allowed.join(', ') || 'none'}`);
    }

    const commission = await this.prisma.commission.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: actorId,
        approvedAt: new Date(),
      },
    });

    await this.activity.logEntityEvent({
      tenantId, userId: actorId, type: 'COMMISSION_APPROVED',
      subject: `Commission ${current.employeeId} approved`,
      entity: 'Commission', entityId: id, branchId: commission.branchId,
    });
    await this.audit.logMutation(actorId, tenantId, 'COMMISSION', 'Commission', id, 'STATUS_CHANGE', { from: current.status, to: 'APPROVED' }, commission.branchId ?? undefined);

    return commission;
  }

  async reject(tenantId: string, actorId: string, id: string) {
    const current = await this.findById(tenantId, id);

    const check = validateStatusTransition('commission', current.status, 'REJECTED');
    if (!check.valid) {
      throw new BadRequestException(`Cannot reject commission in status ${current.status}. Allowed: ${check.allowed.join(', ') || 'none'}`);
    }

    const commission = await this.prisma.commission.update({
      where: { id },
      data: {
        status: 'REJECTED',
      },
    });

    await this.activity.logEntityEvent({
      tenantId, userId: actorId, type: 'COMMISSION_REJECTED',
      subject: `Commission ${current.employeeId} rejected`,
      entity: 'Commission', entityId: id, branchId: commission.branchId,
    });
    await this.audit.logMutation(actorId, tenantId, 'COMMISSION', 'Commission', id, 'STATUS_CHANGE', { from: current.status, to: 'REJECTED' }, commission.branchId ?? undefined);

    return commission;
  }

  async getTimeline(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    return this.activity.findByEntity(tenantId, 'Commission', id);
  }

  async remove(tenantId: string, actorId: string, id: string) {
    const commission = await this.findById(tenantId, id);
    await this.prisma.commission.delete({ where: { id } });
    await this.audit.logMutation(actorId, tenantId, 'COMMISSION', 'Commission', id, 'DELETE', { employeeId: commission.employeeId }, commission.branchId ?? undefined);
    return { id, deleted: true };
  }
}
