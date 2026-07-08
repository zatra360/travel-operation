import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ActivityService } from '../activity/activity.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { QueryClientDto } from './dto/query-client.dto';

const CLIENT_FIELDS = [
  'branchId', 'type', 'status', 'isVip', 'displayName', 'surname', 'givenNames', 'email', 'phone',
  'whatsapp', 'companyName', 'companyInfo', 'profession', 'dateOfBirth', 'gender', 'nationalityId',
  'nationalityLabel', 'language', 'timezone', 'preferredCommunication', 'preferredPaymentMethod',
  'preferredAirlines', 'preferredRoutes', 'loyaltyStatus', 'paymentBehavior', 'communicationStatus',
  'emergencyPhone', 'socialMediaLink', 'address', 'city', 'country', 'nationalId',
  'currencyCode', 'riskScore', 'creditLimit', 'b2bCreditStatus', 'outstandingBalance',
  'refundAmountTotal', 'overdueInvoices', 'visaHistoryCount', 'cancellationCount', 'refundFrequency',
  'ownerId', 'branchName', 'leadSource', 'aiInsights', 'alerts', 'lastActivityAt', 'lastBookingAt',
  'phoneVerified', 'emailVerified', 'whatsappAvailable', 'notes',
] as const;

@Injectable()
export class ClientService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, private readonly activity: ActivityService) {}

  private async validateLinkedIds(tenantId: string, dto: any) {
    if (dto.branchId) {
      const b = await this.prisma.branch.findFirst({ where: { id: dto.branchId, tenantId } });
      if (!b) throw new BadRequestException('Branch does not belong to this tenant');
    }
  }

  private mapFields(dto: any) {
    const d: any = {};
    for (const k of CLIENT_FIELDS) {
      if (dto[k] === undefined) continue;
      d[k] = ['dateOfBirth', 'lastActivityAt', 'lastBookingAt'].includes(k) ? (dto[k] ? new Date(dto[k]) : null) : dto[k];
    }
    return d;
  }

  async create(tenantId: string, actorId: string, dto: CreateClientDto) {
    await this.validateLinkedIds(tenantId, dto);
    const data = this.mapFields(dto);
    const client = await this.prisma.client.create({ data: { tenantId, ...data } });
    await this.audit.logMutation(actorId, tenantId, 'CLIENT', 'Client', client.id, 'CREATE', { displayName: client.displayName }, client.branchId ?? undefined);
    await this.activity.log(tenantId, actorId, 'CLIENT_CREATED', `New client: ${client.displayName}`, 'Client', client.id, client.branchId);
    return client;
  }

  async findAll(tenantId: string, query: QueryClientDto) {
    const page = query.page ?? 1; const limit = query.limit ?? 50; const skip = (page - 1) * limit;
    const where: any = { tenantId, deletedAt: null };
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    if (query.branchId) where.branchId = query.branchId;
    if (query.isVip !== undefined) where.isVip = query.isVip;
    if (query.search) {
      where.OR = [
        { displayName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
        { companyName: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.client.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.prisma.client.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(tenantId: string, id: string) {
    const client = await this.prisma.client.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  async update(tenantId: string, actorId: string, id: string, dto: UpdateClientDto) {
    await this.findById(tenantId, id);
    await this.validateLinkedIds(tenantId, dto);
    const data = this.mapFields(dto);
    const client = await this.prisma.client.update({ where: { id }, data });
    await this.audit.logMutation(actorId, tenantId, 'CLIENT', 'Client', client.id, 'UPDATE', { changes: dto }, client.branchId ?? undefined);
    await this.activity.log(tenantId, actorId, 'CLIENT_UPDATED', `Client updated: ${client.displayName}`, 'Client', client.id, client.branchId);
    return client;
  }

  async remove(tenantId: string, actorId: string, id: string) {
    const client = await this.findById(tenantId, id);
    await this.prisma.client.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.logMutation(actorId, tenantId, 'CLIENT', 'Client', client.id, 'DELETE', { displayName: client.displayName }, client.branchId ?? undefined);
    return { id, deleted: true };
  }
}
