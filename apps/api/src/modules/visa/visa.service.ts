import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LookupValidationService } from '../master-data/lookup-validation.service';
import { CreateVisaDto, UpdateVisaDto } from './dto/visa.dto';

@Injectable()
export class VisaService {
  constructor(private readonly prisma: PrismaService, private readonly lookup: LookupValidationService) {}

  async create(tenantId: string, clientId: string, actorId: string, dto: CreateVisaDto) {
    await this.prisma.client.findFirstOrThrow({ where: { id: clientId, tenantId, deletedAt: null } });
    await this.lookup.validateMultiple(tenantId, [
      { categoryCode: 'visa-type', code: dto.visaType },
    ].filter((v) => v.code));

    return this.prisma.clientVisa.create({
      data: {
        tenantId, clientId,
        visaType: dto.visaType ?? 'TOURIST',
        visaNumber: dto.visaNumber,
        countryId: dto.countryId,
        passportId: dto.passportId,
        status: dto.status ?? 'PENDING',
        entryType: dto.entryType,
        durationDays: dto.durationDays,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : null,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        applicationDate: dto.applicationDate ? new Date(dto.applicationDate) : null,
        documentId: dto.documentId,
        notes: dto.notes,
        createdById: actorId,
      },
      include: { country: { select: { id: true, name: true, iso2: true } }, passport: { select: { id: true, passportNumber: true } } },
    });
  }

  async findByClient(tenantId: string, clientId: string) {
    await this.prisma.client.findFirstOrThrow({ where: { id: clientId, tenantId, deletedAt: null } });
    return this.prisma.clientVisa.findMany({
      where: { tenantId, clientId, isActive: true },
      include: { country: { select: { id: true, name: true, iso2: true } }, passport: { select: { id: true, passportNumber: true } }, client: { select: { id: true, displayName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll(tenantId: string, query?: { page?: number; limit?: number; search?: string }) {
    const page = query?.page ?? 1; const limit = query?.limit ?? 25; const skip = (page - 1) * limit;
    const where: any = { tenantId };
    if (query?.search) where.OR = [{ visaNumber: { contains: query.search, mode: 'insensitive' } }];
    const [data, total] = await Promise.all([
      this.prisma.clientVisa.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit, include: { country: { select: { id: true, name: true } }, client: { select: { id: true, displayName: true } } } }),
      this.prisma.clientVisa.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(tenantId: string, id: string) {
    const v = await this.prisma.clientVisa.findFirst({
      where: { id, tenantId },
      include: { country: { select: { id: true, name: true, iso2: true } }, passport: { select: { id: true, passportNumber: true, fullName: true } } },
    });
    if (!v) throw new NotFoundException('Visa not found');
    return v;
  }

  async update(tenantId: string, id: string, dto: UpdateVisaDto) {
    await this.findOne(tenantId, id);
    await this.lookup.validateMultiple(tenantId, [
      { categoryCode: 'visa-type', code: dto.visaType },
    ].filter((v) => v.code));
    return this.prisma.clientVisa.update({
      where: { id },
      data: {
        ...(dto.visaType !== undefined && { visaType: dto.visaType }),
        ...(dto.visaNumber !== undefined && { visaNumber: dto.visaNumber }),
        ...(dto.countryId !== undefined && { countryId: dto.countryId }),
        ...(dto.passportId !== undefined && { passportId: dto.passportId }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.entryType !== undefined && { entryType: dto.entryType }),
        ...(dto.durationDays !== undefined && { durationDays: dto.durationDays }),
        ...(dto.issueDate !== undefined && { issueDate: dto.issueDate ? new Date(dto.issueDate) : null }),
        ...(dto.expiryDate !== undefined && { expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null }),
        ...(dto.applicationDate !== undefined && { applicationDate: dto.applicationDate ? new Date(dto.applicationDate) : null }),
        ...(dto.approvalDate !== undefined && { approvalDate: dto.approvalDate ? new Date(dto.approvalDate) : null }),
        ...(dto.documentId !== undefined && { documentId: dto.documentId }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: { country: { select: { id: true, name: true, iso2: true } } },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.clientVisa.update({ where: { id }, data: { isActive: false } });
  }
}
