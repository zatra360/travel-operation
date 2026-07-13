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
        documentId: dto.documentId,
        notes: dto.notes,
        createdById: actorId,
      },
    });
  }

  async findByClient(tenantId: string, clientId: string) {
    await this.prisma.client.findFirstOrThrow({ where: { id: clientId, tenantId, deletedAt: null } });
    return this.prisma.clientPassport.findMany({
      where: { tenantId, clientId },
      orderBy: { createdAt: 'desc' },
    });
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
