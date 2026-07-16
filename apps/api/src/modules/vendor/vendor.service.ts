import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateVendorDto, UpdateVendorDto, QueryVendorDto } from './dto/vendor.dto';

@Injectable()
export class VendorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(tenantId: string, actorId: string, dto: CreateVendorDto) {
    const vendor = await this.prisma.vendor.create({
      data: {
        tenantId,
        branchId: dto.branchId ?? null,
        vendorType: dto.vendorType,
        name: dto.name,
        code: dto.code,
        contactPerson: dto.contactPerson ?? null,
        contactEmail: dto.contactEmail ?? null,
        contactPhone: dto.contactPhone ?? null,
        address: dto.address ?? null,
        city: dto.city ?? null,
        country: dto.country ?? null,
        website: dto.website ?? null,
        paymentTerms: dto.paymentTerms ?? null,
        creditLimit: dto.creditLimit ?? 0,
        currencyCode: dto.currencyCode ?? 'USD',
        commissionPct: dto.commissionPct ?? 0,
        commissionType: dto.commissionType ?? null,
        gdsProvider: dto.gdsProvider ?? null,
        notes: dto.notes ?? null,
      },
    });
    await this.audit.logMutation(actorId, tenantId, 'VENDOR', 'Vendor', vendor.id, 'CREATE', { name: vendor.name, code: vendor.code });
    return vendor;
  }

  async findAll(tenantId: string, query: QueryVendorDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;
    const where: any = { tenantId, deletedAt: null };
    if (query.search) where.OR = [{ name: { contains: query.search, mode: 'insensitive' } }, { code: { contains: query.search, mode: 'insensitive' } }];
    if (query.vendorType) where.vendorType = query.vendorType;
    if (query.status) where.status = query.status;
    const [data, total] = await Promise.all([
      this.prisma.vendor.findMany({ where, orderBy: { name: 'asc' }, skip, take: limit }),
      this.prisma.vendor.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(tenantId: string, id: string) {
    const vendor = await this.prisma.vendor.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return vendor;
  }

  async update(tenantId: string, actorId: string, id: string, dto: UpdateVendorDto) {
    await this.findById(tenantId, id);
    const vendor = await this.prisma.vendor.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.vendorType !== undefined && { vendorType: dto.vendorType }),
        ...(dto.contactPerson !== undefined && { contactPerson: dto.contactPerson }),
        ...(dto.contactEmail !== undefined && { contactEmail: dto.contactEmail }),
        ...(dto.contactPhone !== undefined && { contactPhone: dto.contactPhone }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.country !== undefined && { country: dto.country }),
        ...(dto.website !== undefined && { website: dto.website }),
        ...(dto.paymentTerms !== undefined && { paymentTerms: dto.paymentTerms }),
        ...(dto.creditLimit !== undefined && { creditLimit: dto.creditLimit }),
        ...(dto.currencyCode !== undefined && { currencyCode: dto.currencyCode }),
        ...(dto.commissionPct !== undefined && { commissionPct: dto.commissionPct }),
        ...(dto.commissionType !== undefined && { commissionType: dto.commissionType }),
        ...(dto.gdsProvider !== undefined && { gdsProvider: dto.gdsProvider }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.branchId !== undefined && { branchId: dto.branchId }),
      },
    });
    await this.audit.logMutation(actorId, tenantId, 'VENDOR', 'Vendor', vendor.id, 'UPDATE', { changes: dto });
    return vendor;
  }

  async remove(tenantId: string, actorId: string, id: string) {
    const vendor = await this.findById(tenantId, id);
    await this.prisma.vendor.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.logMutation(actorId, tenantId, 'VENDOR', 'Vendor', vendor.id, 'DELETE', { name: vendor.name });
    return { id, deleted: true };
  }
}
