import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateContractDto, UpdateContractDto, SignContractDto } from './dto/contract.dto';

@Injectable()
export class ContractService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, clientId: string, actorId: string, dto: CreateContractDto) {
    await this.prisma.client.findFirstOrThrow({ where: { id: clientId, tenantId, deletedAt: null } });
    const contractNumber = dto.contractNumber || `CON-${Date.now().toString(36).toUpperCase()}`;

    return this.prisma.contract.create({
      data: {
        tenantId, clientId,
        contractNumber,
        subject: dto.subject,
        contractType: dto.contractType ?? 'SERVICE_AGREEMENT',
        status: 'DRAFT',
        currencyCode: dto.currencyCode ?? 'USD',
        amount: dto.amount ?? 0,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        description: dto.description,
        terms: dto.terms,
        quotationId: dto.quotationId,
        createdById: actorId,
      },
    });
  }

  async findByClient(tenantId: string, clientId: string) {
    return this.prisma.contract.findMany({
      where: { tenantId, clientId, deletedAt: null },
      include: { quotation: { select: { id: true, quoteNumber: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const c = await this.prisma.contract.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        client: { select: { id: true, displayName: true, email: true } },
        quotation: { select: { id: true, quoteNumber: true, grandTotal: true } },
      },
    });
    if (!c) throw new NotFoundException('Contract not found');
    return c;
  }

  async findByHash(hash: string) {
    const c = await this.prisma.contract.findUnique({
      where: { publicHash: hash },
      include: {
        client: { select: { id: true, displayName: true } },
        quotation: { select: { id: true, quoteNumber: true } },
      },
    });
    if (!c || c.deletedAt) return null;
    return c;
  }

  async update(tenantId: string, id: string, dto: UpdateContractDto) {
    await this.findOne(tenantId, id);
    return this.prisma.contract.update({
      where: { id },
      data: {
        ...(dto.subject !== undefined && { subject: dto.subject }),
        ...(dto.contractType !== undefined && { contractType: dto.contractType }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.currencyCode !== undefined && { currencyCode: dto.currencyCode }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.startDate !== undefined && { startDate: dto.startDate ? new Date(dto.startDate) : null }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.terms !== undefined && { terms: dto.terms }),
      },
    });
  }

  async send(tenantId: string, id: string) {
    const contract = await this.findOne(tenantId, id);
    const hash = contract.publicHash || randomBytes(16).toString('hex');
    return this.prisma.contract.update({
      where: { id },
      data: { status: 'SENT', publicHash: hash },
    });
  }

  async sign(tenantId: string, id: string, dto: SignContractDto, ip?: string) {
    const contract = await this.findOne(tenantId, id);
    return this.prisma.contract.update({
      where: { id },
      data: {
        status: 'SIGNED',
        signedAt: new Date(),
        signedByName: dto.fullName,
        signedByEmail: dto.email,
        signature: dto.signature,
        signatureIp: ip,
      },
    });
  }

  async signByHash(hash: string, dto: SignContractDto, ip?: string) {
    const contract = await this.prisma.contract.findUnique({ where: { publicHash: hash } });
    if (!contract || contract.deletedAt) throw new NotFoundException('Contract not found');
    return this.prisma.contract.update({
      where: { id: contract.id },
      data: {
        status: 'SIGNED',
        signedAt: new Date(),
        signedByName: dto.fullName,
        signedByEmail: dto.email,
        signature: dto.signature,
        signatureIp: ip,
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.contract.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
