import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LookupValidationService } from '../master-data/lookup-validation.service';
import { CreateInsuranceDto, UpdateInsuranceDto, QueryInsuranceDto } from './dto/insurance.dto';

@Injectable()
export class InsuranceService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, private readonly lookup: LookupValidationService) {}

  async create(tenantId: string, actorId: string, dto: CreateInsuranceDto) {
    await this.lookup.validateMultiple(tenantId, [
      { categoryCode: 'insurance-type', code: dto.insuranceType },
    ].filter((v) => v.code));
    const insurance = await this.prisma.insurance.create({
      data: {
        tenantId, branchId: dto.branchId ?? null,
        policyNumber: dto.policyNumber, providerId: dto.providerId ?? null,
        bookingId: dto.bookingId ?? null, clientId: dto.clientId ?? null,
        insuranceType: dto.insuranceType ?? 'TRAVEL', coverage: dto.coverage ?? null,
        premium: dto.premium ?? 0, currencyCode: dto.currencyCode ?? 'USD',
        sumInsured: dto.sumInsured ?? 0,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        notes: dto.notes ?? null,
      },
    });
    await this.audit.logMutation(actorId, tenantId, 'INSURANCE', 'Insurance', insurance.id, 'CREATE', { policyNumber: insurance.policyNumber });
    return insurance;
  }

  async findAll(tenantId: string, query: QueryInsuranceDto) {
    const page = query.page ?? 1; const limit = query.limit ?? 50; const skip = (page - 1) * limit;
    const where: any = { tenantId, deletedAt: null };
    if (query.search) where.OR = [{ policyNumber: { contains: query.search, mode: 'insensitive' } }];
    if (query.status) where.status = query.status;
    if (query.clientId) where.clientId = query.clientId;
    if (query.bookingId) where.bookingId = query.bookingId;
    const [data, total] = await Promise.all([
      this.prisma.insurance.findMany({
        where, orderBy: { createdAt: 'desc' }, skip, take: limit,
        include: { client: { select: { id: true, displayName: true } }, booking: { select: { id: true, bookingRef: true } }, provider: { select: { id: true, name: true } } },
      }),
      this.prisma.insurance.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(tenantId: string, id: string) {
    const insurance = await this.prisma.insurance.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { client: { select: { id: true, displayName: true } }, booking: { select: { id: true, bookingRef: true } }, provider: { select: { id: true, name: true } } },
    });
    if (!insurance) throw new NotFoundException('Insurance policy not found');
    return insurance;
  }

  async update(tenantId: string, actorId: string, id: string, dto: UpdateInsuranceDto) {
    await this.findById(tenantId, id);
    await this.lookup.validateMultiple(tenantId, [
      { categoryCode: 'insurance-type', code: dto.insuranceType },
    ].filter((v) => v.code));
    const insurance = await this.prisma.insurance.update({
      where: { id },
      data: {
        ...(dto.policyNumber !== undefined && { policyNumber: dto.policyNumber }),
        ...(dto.providerId !== undefined && { providerId: dto.providerId }),
        ...(dto.insuranceType !== undefined && { insuranceType: dto.insuranceType }),
        ...(dto.coverage !== undefined && { coverage: dto.coverage }),
        ...(dto.premium !== undefined && { premium: dto.premium }),
        ...(dto.sumInsured !== undefined && { sumInsured: dto.sumInsured }),
        ...(dto.startDate !== undefined && { startDate: dto.startDate ? new Date(dto.startDate) : null }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
    await this.audit.logMutation(actorId, tenantId, 'INSURANCE', 'Insurance', insurance.id, 'UPDATE', { changes: dto });
    return insurance;
  }

  async remove(tenantId: string, actorId: string, id: string) {
    const insurance = await this.findById(tenantId, id);
    await this.prisma.insurance.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.logMutation(actorId, tenantId, 'INSURANCE', 'Insurance', insurance.id, 'DELETE', { policyNumber: insurance.policyNumber });
    return { id, deleted: true };
  }
}
