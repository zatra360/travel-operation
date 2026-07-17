import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { enforceBranchScope } from '../../common/utils/scope';
import { AuditService } from '../audit/audit.service';
import { ActivityService } from '../activity/activity.service';
import { LookupValidationService } from '../master-data/lookup-validation.service';
import { SearchService } from '../../common/services/search.service';
import { ClientScoringService } from './client-scoring.service';
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
  'phoneVerified', 'emailVerified', 'whatsappAvailable',
  'activityScore', 'lifetimeValue', 'totalBookings', 'totalPayments', 'totalSpent', 'lastScoredAt', 'notes',
] as const;

@Injectable()
export class ClientService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, private readonly activity: ActivityService, private readonly lookup: LookupValidationService, private readonly search: SearchService, private readonly scoring: ClientScoringService) {}

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
    await this.lookup.validateMultiple(tenantId, [
      { categoryCode: 'client-type', code: dto.type },
      { categoryCode: 'client-status', code: dto.status },
      { categoryCode: 'contact-method', code: dto.preferredCommunication },
      { categoryCode: 'payment-method', code: dto.preferredPaymentMethod },
    ].filter((v) => v.code));
    const data = this.mapFields(dto);
    const client = await this.prisma.client.create({ data: { tenantId, ...data } });
    await this.audit.logMutation(actorId, tenantId, 'CLIENT', 'Client', client.id, 'CREATE', { displayName: client.displayName }, client.branchId ?? undefined);
    await this.activity.log(tenantId, actorId, 'CLIENT_CREATED', `New client: ${client.displayName}`, 'Client', client.id, client.branchId);
    this.search.indexClients(tenantId, [client]).catch(() => {});
    return client;
  }

  async findAll(tenantId: string, query: QueryClientDto, activeBranchId?: string) {
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
        { nationalId: { contains: query.search, mode: 'insensitive' } },
        { passports: { some: { passportNumber: { contains: query.search, mode: 'insensitive' } } } },
      ];
    }
    enforceBranchScope(where, activeBranchId);
    const orderBy: any = query.sortBy === 'activityScore'
      ? [{ activityScore: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }]
      : { createdAt: 'desc' };
    const [data, total] = await Promise.all([
      this.prisma.client.findMany({ where, orderBy, skip, take: limit }),
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
    await this.lookup.validateMultiple(tenantId, [
      { categoryCode: 'client-type', code: dto.type },
      { categoryCode: 'client-status', code: dto.status },
      { categoryCode: 'contact-method', code: dto.preferredCommunication },
      { categoryCode: 'payment-method', code: dto.preferredPaymentMethod },
    ].filter((v) => v.code));
    const data = this.mapFields(dto);
    const client = await this.prisma.client.update({ where: { id }, data });
    await this.audit.logMutation(actorId, tenantId, 'CLIENT', 'Client', client.id, 'UPDATE', { changes: dto }, client.branchId ?? undefined);
    await this.activity.log(tenantId, actorId, 'CLIENT_UPDATED', `Client updated: ${client.displayName}`, 'Client', client.id, client.branchId);
    this.search.indexClients(tenantId, [client]).catch(() => {});
    return client;
  }

  async remove(tenantId: string, actorId: string, id: string) {
    const client = await this.findById(tenantId, id);
    await this.prisma.client.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.logMutation(actorId, tenantId, 'CLIENT', 'Client', client.id, 'DELETE', { displayName: client.displayName }, client.branchId ?? undefined);
    return { id, deleted: true };
  }

  async checkDuplicates(tenantId: string, email: string | undefined, phone: string | undefined, excludeId?: string, passport?: string) {
    const matches: any[] = [];
    const safeEmail = email?.trim().toLowerCase();
    const safePhone = phone?.trim();
    const safePassport = passport?.trim();

    if (safeEmail) {
      const client = await this.prisma.client.findFirst({
        where: { tenantId, email: { equals: safeEmail, mode: 'insensitive' }, deletedAt: null, ...(excludeId ? { id: { not: excludeId } } : {}) },
        select: { id: true, displayName: true, phone: true },
      });
      if (client) matches.push({ id: client.id, name: client.displayName, type: 'client', matchOn: 'email', phone: client.phone });

      const lead = await this.prisma.lead.findFirst({
        where: { tenantId, email: { equals: safeEmail, mode: 'insensitive' }, deletedAt: null, status: { notIn: ['LOST', 'DUPLICATE', 'SPAM'] } },
        select: { id: true, fullName: true, primaryMobile: true },
      });
      if (lead) matches.push({ id: lead.id, name: lead.fullName, type: 'lead', matchOn: 'email', phone: lead.primaryMobile });
    }

    if (safePhone) {
      const client = await this.prisma.client.findFirst({
        where: { tenantId, deletedAt: null, ...(excludeId ? { id: { not: excludeId } } : {}), OR: [{ phone: { equals: safePhone } }, { whatsapp: { equals: safePhone } }] },
        select: { id: true, displayName: true, phone: true },
      });
      if (client && !matches.find(m => m.id === client.id)) matches.push({ id: client.id, name: client.displayName, type: 'client', matchOn: 'phone', phone: client.phone });

      const lead = await this.prisma.lead.findFirst({
        where: { tenantId, deletedAt: null, status: { notIn: ['LOST', 'DUPLICATE', 'SPAM'] }, OR: [{ primaryMobile: { equals: safePhone } }, { secondaryMobile: { equals: safePhone } }, { whatsappNumber: { equals: safePhone } }] },
        select: { id: true, fullName: true, primaryMobile: true },
      });
      if (lead && !matches.find(m => m.id === lead.id)) matches.push({ id: lead.id, name: lead.fullName, type: 'lead', matchOn: 'phone', phone: lead.primaryMobile });
    }

    if (safePassport) {
      const passportClient = await this.prisma.clientPassport.findFirst({
        where: { tenantId, passportNumber: { equals: safePassport, mode: 'insensitive' } },
        include: { client: { select: { id: true, displayName: true, phone: true } } },
      });
      if (passportClient && !matches.find(m => m.id === passportClient.clientId)) {
        matches.push({ id: passportClient.clientId, name: passportClient.client.displayName, type: 'client', matchOn: 'passport', phone: passportClient.client.phone });
      }

      const leadWithPassport = await this.prisma.lead.findFirst({
        where: { tenantId, passportNationalityId: { equals: safePassport, mode: 'insensitive' }, deletedAt: null },
        select: { id: true, fullName: true, primaryMobile: true },
      });
      if (leadWithPassport && !matches.find(m => m.id === leadWithPassport.id)) {
        matches.push({ id: leadWithPassport.id, name: leadWithPassport.fullName, type: 'lead', matchOn: 'passport', phone: leadWithPassport.primaryMobile });
      }
    }

    return { duplicates: matches };
  }

  async calculateActivityScore(tenantId: string, clientId: string) {
    await this.findById(tenantId, clientId);
    return this.scoring.computeAndPersist(tenantId, clientId);
  }

  async getTimeline(tenantId: string, id: string) {
    return this.prisma.activity.findMany({
      where: { tenantId, OR: [{ entity: 'Client', entityId: id }, { entity: 'Lead', entityId: id }] },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, type: true, subject: true, content: true, metadata: true, createdAt: true },
    });
  }
}
