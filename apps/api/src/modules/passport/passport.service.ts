import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePassportDto, UpdatePassportDto } from './dto/passport.dto';

@Injectable()
export class PassportService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, clientId: string, actorId: string, dto: CreatePassportDto) {
    await this.prisma.client.findFirstOrThrow({ where: { id: clientId, tenantId, deletedAt: null } });
    return this.prisma.clientPassport.create({
      data: {
        tenantId, clientId,
        passportNumber: dto.passportNumber,
        fullName: dto.fullName,
        expiryDate: new Date(dto.expiryDate),
        issueDate: dto.issueDate ? new Date(dto.issueDate) : null,
        nationality: dto.nationality,
        countryCode: dto.countryCode,
        relation: dto.relation,
        isVerified: dto.isVerified ?? false,
        documentId: dto.documentId,
        notes: dto.notes,
        createdById: actorId,
      },
    });
  }

  async findByClient(tenantId: string, clientId: string) {
    await this.prisma.client.findFirstOrThrow({ where: { id: clientId, tenantId, deletedAt: null } });
    return this.prisma.clientPassport.findMany({
      where: { tenantId, clientId, isActive: true },
      orderBy: { createdAt: 'desc' },
      include: { client: { select: { id: true, displayName: true } } },
    });
  }

  async findAll(tenantId: string, query?: { page?: number; limit?: number; search?: string }) {
    const page = query?.page ?? 1; const limit = query?.limit ?? 25; const skip = (page - 1) * limit;
    const where: any = { tenantId };
    if (query?.search) where.OR = [{ fullName: { contains: query.search, mode: 'insensitive' } }, { passportNumber: { contains: query.search, mode: 'insensitive' } }];
    const [data, total] = await Promise.all([
      this.prisma.clientPassport.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit, include: { client: { select: { id: true, displayName: true } } } }),
      this.prisma.clientPassport.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(tenantId: string, id: string) {
    const p = await this.prisma.clientPassport.findFirst({ where: { id, tenantId } });
    if (!p) throw new NotFoundException('Passport not found');
    return p;
  }

  async update(tenantId: string, id: string, dto: UpdatePassportDto) {
    await this.findOne(tenantId, id);
    return this.prisma.clientPassport.update({
      where: { id },
      data: {
        ...(dto.passportNumber !== undefined && { passportNumber: dto.passportNumber }),
        ...(dto.fullName !== undefined && { fullName: dto.fullName }),
        ...(dto.expiryDate !== undefined && { expiryDate: new Date(dto.expiryDate) }),
        ...(dto.issueDate !== undefined && { issueDate: dto.issueDate ? new Date(dto.issueDate) : null }),
        ...(dto.nationality !== undefined && { nationality: dto.nationality }),
        ...(dto.countryCode !== undefined && { countryCode: dto.countryCode }),
        ...(dto.relation !== undefined && { relation: dto.relation }),
        ...(dto.isVerified !== undefined && { isVerified: dto.isVerified, verifiedAt: dto.isVerified ? new Date() : null }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.documentId !== undefined && { documentId: dto.documentId }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.clientPassport.update({ where: { id }, data: { isActive: false } });
  }
}
