import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { enforceBranchScope } from '../../common/utils/scope';
import { AuditService } from '../audit/audit.service';
import { ActivityService } from '../activity/activity.service';
import { LookupValidationService } from '../master-data/lookup-validation.service';
import { SlaService } from '../../common/services/sla.service';
import { validateStatusTransition } from '../../common/utils/status-transitions';
import { SearchService } from '../../common/services/search.service';
import { FollowUpService } from '../follow-up/follow-up.service';
import { resolveServiceTypeRef } from '../service-ops/service-type-map';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { QueryLeadDto } from './dto/query-lead.dto';

const LEAD_CREATE_FIELDS = [
  'branchId', 'fullName', 'firstName', 'lastName', 'preferredName', 'gender', 'dateOfBirth',
  'nationalityId', 'passportNationalityId', 'maritalStatus', 'profession', 'companyName', 'designation',
  'primaryMobile', 'secondaryMobile', 'whatsappNumber', 'email', 'alternativeEmail',
  'facebookProfile', 'instagramHandle', 'linkedinProfile', 'telegramHandle', 'viberHandle',
  'countryId', 'city', 'areaRegion', 'fullAddress', 'postalCode', 'timezoneId',
  'source', 'sourcePlatform', 'campaignName', 'adSet', 'referralSource', 'referralPerson',
  'utmSource', 'utmMedium', 'utmCampaign', 'utmContent', 'landingPage', 'importBatchId', 'creationMethod',
  'serviceType', 'travelCategory', 'isDomestic', 'tripType', 'departureCity', 'departureAirportId',
  'destinationCity', 'destinationAirportId', 'preferredAirlineIds', 'transitPreference', 'cabinTypeId',
  'flexibleDates', 'preferredTravelDate', 'returnDate', 'alternateDateOptions',
  'numAdults', 'numChildren', 'numInfants', 'passengerNotes',
  'visaCountryId', 'visaTypeText', 'travelHistoryNotes', 'previousRefusal', 'urgentVisaProcessing',
  'hotelPreference', 'hotelStarCategory', 'mealPreference', 'tourType', 'destinationInterests',
  'preferredContactMethod', 'preferredContactTime', 'languagePreference',
  'leadScore', 'conversionProbability', 'potentialRevenue', 'urgencyLevel',
  'firstResponseAt', 'lastContactAt', 'nextFollowUpAt', 'followUpCount', 'lastFollowUpOutcome', 'expectedConversionAt',
  'approxBudget', 'budgetMin', 'budgetMax', 'currencyCode', 'paymentPreference', 'financingRequirement',
  'estimatedProfit', 'estimatedCommission', 'vipPotential', 'repeatCustomerPotential',
  'smartPriority', 'leadTemperature', 'behavioralPattern', 'engagementScore', 'conversionPredictionScore',
  'autoAssignmentTriggered', 'autoReminderSent', 'duplicateScore',
  'isCorporateLead', 'companyType', 'employeeCount', 'travelFrequency', 'corporateAgreementPotential',
  'agentType', 'agencyName', 'subAgentReference', 'commissionCategory',
  'clientId', 'assignedToId', 'ownerId', 'teamId', 'approvalRequired', 'notes',
] as const;

@Injectable()
export class LeadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly activity: ActivityService,
    private readonly lookup: LookupValidationService,
    private readonly sla: SlaService,
    private readonly search: SearchService,
    private readonly followUps: FollowUpService,
  ) {}

  private async validateLinkedIds(tenantId: string, dto: any) {
    if (dto.branchId) {
      const branch = await this.prisma.branch.findFirst({ where: { id: dto.branchId, tenantId } });
      if (!branch) throw new BadRequestException('Branch does not belong to this tenant');
    }
    if (dto.clientId) {
      const client = await this.prisma.client.findFirst({ where: { id: dto.clientId, tenantId } });
      if (!client) throw new BadRequestException('Client does not belong to this tenant');
    }
    if (dto.assignedToId) {
      const member = await this.prisma.userTenantMembership.findUnique({
        where: { userId_tenantId: { userId: dto.assignedToId, tenantId } },
      });
      if (!member) throw new BadRequestException('Assigned user does not belong to this tenant');
    }
  }

  private mapDateFields(dto: any) {
    const d: any = {};
    for (const k of LEAD_CREATE_FIELDS) {
      if (dto[k] === undefined) continue;
      d[k] = ['dateOfBirth', 'preferredTravelDate', 'returnDate', 'firstResponseAt',
        'lastContactAt', 'nextFollowUpAt', 'expectedConversionAt'].includes(k)
        ? (dto[k] ? new Date(dto[k]) : null)
        : dto[k];
    }
    return d;
  }

  async create(tenantId: string, actorId: string, dto: CreateLeadDto) {
    if (!dto.email && !dto.phone && !dto.primaryMobile) {
      throw new BadRequestException('Email or phone is required');
    }
    await this.validateLinkedIds(tenantId, dto);
    await this.lookup.validateMultiple(tenantId, [
      { categoryCode: 'lead-status', code: dto.status },
      { categoryCode: 'lead-priority', code: dto.priority },
      { categoryCode: 'lead-source', code: dto.source },
      { categoryCode: 'service-type', code: dto.serviceType },
      { categoryCode: 'travel-category', code: dto.travelCategory },
      { categoryCode: 'trip-type', code: dto.tripType },
    ].filter((v) => v.code));
    const data = this.mapDateFields(dto);
    const status = dto.status ?? 'NEW';
    const slaDueAt = this.sla.isTerminal(status) ? null : this.sla.calculateDueAt(status);
    if (dto.serviceType !== undefined) {
      const ref = await resolveServiceTypeRef(this.prisma, dto.serviceType);
      data.serviceTypeId = ref.id;
    }

    const lead = await this.prisma.lead.create({
      data: { tenantId, status, slaDueAt, priority: dto.priority ?? 'MEDIUM', ...data },
    });
    await this.audit.logMutation(actorId, tenantId, 'LEAD', 'Lead', lead.id, 'CREATE', { fullName: lead.fullName }, lead.branchId ?? undefined);
    await this.activity.log(tenantId, actorId, 'LEAD_CREATED', `New lead: ${lead.fullName}`, 'Lead', lead.id, lead.branchId);
    this.search.indexLeads(tenantId, [lead]).catch(() => {});
    this.autoAssign(tenantId, lead).catch(() => {});
    return lead;
  }

  async findAll(tenantId: string, query: QueryLeadDto, activeBranchId?: string) {
    const page = query.page ?? 1; const limit = query.limit ?? 50; const skip = (page - 1) * limit;
    const where: any = { tenantId, deletedAt: null };
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.assignedToId) where.assignedToId = query.assignedToId;
    if (query.branchId) where.branchId = query.branchId;
    if (query.serviceType) where.serviceType = query.serviceType;
    if (query.source) where.source = query.source;
    if (query.leadTemperature) where.leadTemperature = query.leadTemperature;
    if (query.isCorporateLead !== undefined) where.isCorporateLead = query.isCorporateLead;
    if (query.travelDateFrom || query.travelDateTo) {
      where.preferredTravelDate = {};
      if (query.travelDateFrom) where.preferredTravelDate.gte = new Date(query.travelDateFrom);
      if (query.travelDateTo) where.preferredTravelDate.lte = new Date(query.travelDateTo);
    }
    if (query.nextFollowUpFrom || query.nextFollowUpTo) {
      where.nextFollowUpAt = {};
      if (query.nextFollowUpFrom) where.nextFollowUpAt.gte = new Date(query.nextFollowUpFrom);
      if (query.nextFollowUpTo) where.nextFollowUpAt.lte = new Date(query.nextFollowUpTo);
    }
    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { primaryMobile: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    enforceBranchScope(where, activeBranchId);
    const [data, total] = await Promise.all([
      this.prisma.lead.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.prisma.lead.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(tenantId: string, id: string) {
    const lead = await this.prisma.lead.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async update(tenantId: string, actorId: string, id: string, dto: UpdateLeadDto) {
    const current = await this.findById(tenantId, id);
    await this.validateLinkedIds(tenantId, dto);

    if (dto.status && dto.status !== current.status) {
      const check = validateStatusTransition('lead', current.status, dto.status);
      if (!check.valid) {
        throw new BadRequestException(`Invalid lead transition from ${current.status} to ${dto.status}. Allowed: ${check.allowed.join(', ') || 'none'}`);
      }
      if (dto.status === 'LOST' && !(dto as any).lostReason) {
        throw new BadRequestException('Lost reason is required when marking a lead as lost');
      }
    }

    const newStatus = dto.status ?? current.status;
    const slaDueAt = this.sla.isTerminal(newStatus) ? null : (newStatus !== current.status ? this.sla.calculateDueAt(newStatus) : current.slaDueAt);

    const data = this.mapDateFields(dto);
    if (dto.serviceType !== undefined) {
      const ref = await resolveServiceTypeRef(this.prisma, dto.serviceType);
      data.serviceTypeId = ref.id;
    }
    const lead = await this.prisma.lead.update({ where: { id }, data: { ...data, slaDueAt } });
    await this.audit.logMutation(actorId, tenantId, 'LEAD', 'Lead', lead.id, 'UPDATE', { changes: dto, lostReason: (dto as any).lostReason }, lead.branchId ?? undefined);
    await this.activity.log(tenantId, actorId, dto.status === 'LOST' ? 'LEAD_MARKED_LOST' : 'LEAD_UPDATED', `Lead updated: ${lead.fullName}${(dto as any).lostReason ? ` (reason: ${(dto as any).lostReason})` : ''}`, 'Lead', lead.id, lead.branchId);
    this.search.indexLeads(tenantId, [lead]).catch(() => {});
    if (dto.status === 'CONTACTED' && current.status !== 'CONTACTED') {
      this.scheduleContactFollowUp(tenantId, actorId, lead, slaDueAt).catch(() => {});
    }
    return lead;
  }

  private async scheduleContactFollowUp(tenantId: string, actorId: string, lead: any, slaDueAt: Date | null) {
    const existing = await this.prisma.followUp.findFirst({
      where: { tenantId, leadId: lead.id, status: 'PENDING' },
      select: { id: true },
    });
    if (existing) return;
    await this.followUps.create(tenantId, actorId, {
      subject: `Follow up with ${lead.fullName}`,
      description: 'Auto-scheduled after lead was marked as contacted.',
      scheduledAt: (slaDueAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000)).toISOString(),
      channel: lead.preferredContactMethod && ['PHONE', 'EMAIL', 'WHATSAPP', 'MEETING', 'SMS'].includes(lead.preferredContactMethod) ? lead.preferredContactMethod : 'PHONE',
      leadId: lead.id,
      assignedToId: lead.assignedToId ?? undefined,
      branchId: lead.branchId ?? undefined,
    });
  }

  async convertToClient(tenantId: string, actorId: string, id: string) {
    const lead = await this.findById(tenantId, id);
    const client = await this.prisma.$transaction(async (tx) => {
      const created = await tx.client.create({
        data: {
          tenantId, branchId: lead.branchId, displayName: lead.fullName,
          givenNames: lead.firstName, surname: lead.lastName,
          email: lead.email, phone: lead.primaryMobile,
          whatsapp: lead.whatsappNumber,
          type: lead.isCorporateLead ? 'COMPANY' : 'PERSON',
          status: 'ACTIVE', isVip: lead.vipPotential ?? false,
          leadSource: lead.source, nationalityLabel: lead.nationalityId,
          dateOfBirth: lead.dateOfBirth, gender: lead.gender,
          profession: lead.profession, companyName: lead.companyName,
          address: lead.fullAddress, city: lead.city, country: lead.countryId,
          preferredCommunication: lead.preferredContactMethod,
          language: lead.languagePreference,
          ownerId: lead.assignedToId,
          notes: lead.notes,
        },
      });
      await tx.lead.update({ where: { id }, data: { status: 'WON', clientId: created.id } });

      if (lead.passportNationalityId) {
        await tx.clientPassport.create({
          data: {
            tenantId, clientId: created.id,
            passportNumber: lead.passportNationalityId,
            fullName: lead.fullName,
            expiryDate: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000),
            status: 'DRAFT',
            isVerified: false,
            nationality: lead.nationalityId,
          },
        });
      }

      return created;
    });
    await this.audit.logMutation(actorId, tenantId, 'LEAD', 'Lead', lead.id, 'UPDATE', { convertedToClientId: client.id }, lead.branchId ?? undefined);
    await this.activity.log(tenantId, actorId, 'LEAD_CONVERTED', `Lead converted to client: ${client.displayName}`, 'Client', client.id, lead.branchId);
    this.search.indexClients(tenantId, [client]).catch(() => {});
    return client;
  }

  async remove(tenantId: string, actorId: string, id: string) {
    const lead = await this.findById(tenantId, id);
    await this.prisma.lead.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.logMutation(actorId, tenantId, 'LEAD', 'Lead', lead.id, 'DELETE', { fullName: lead.fullName }, lead.branchId ?? undefined);
    return { id, deleted: true };
  }

  async checkDuplicates(tenantId: string, email: string | undefined, phone: string | undefined, excludeId?: string) {
    const matches: any[] = [];
    const safeEmail = email?.trim().toLowerCase();
    const safePhone = phone?.trim();

    if (safeEmail) {
      const client = await this.prisma.client.findFirst({
        where: { tenantId, email: { equals: safeEmail, mode: 'insensitive' }, deletedAt: null },
        select: { id: true, displayName: true, phone: true },
      });
      if (client) matches.push({ id: client.id, name: client.displayName, type: 'client', matchOn: 'email', phone: client.phone });

      const lead = await this.prisma.lead.findFirst({
        where: { tenantId, email: { equals: safeEmail, mode: 'insensitive' }, deletedAt: null, status: { notIn: ['LOST', 'DUPLICATE', 'SPAM'] }, ...(excludeId ? { id: { not: excludeId } } : {}) },
        select: { id: true, fullName: true, primaryMobile: true },
      });
      if (lead) matches.push({ id: lead.id, name: lead.fullName, type: 'lead', matchOn: 'email', phone: lead.primaryMobile });
    }

    if (safePhone) {
      const client = await this.prisma.client.findFirst({
        where: { tenantId, deletedAt: null, OR: [{ phone: { equals: safePhone } }, { whatsapp: { equals: safePhone } }] },
        select: { id: true, displayName: true, phone: true },
      });
      if (client && !matches.find(m => m.id === client.id)) matches.push({ id: client.id, name: client.displayName, type: 'client', matchOn: 'phone', phone: client.phone });

      const lead = await this.prisma.lead.findFirst({
        where: { tenantId, deletedAt: null, status: { notIn: ['LOST', 'DUPLICATE', 'SPAM'] }, ...(excludeId ? { id: { not: excludeId } } : {}), OR: [{ primaryMobile: { equals: safePhone } }, { secondaryMobile: { equals: safePhone } }, { whatsappNumber: { equals: safePhone } }] },
        select: { id: true, fullName: true, primaryMobile: true },
      });
      if (lead && !matches.find(m => m.id === lead.id)) matches.push({ id: lead.id, name: lead.fullName, type: 'lead', matchOn: 'phone', phone: lead.primaryMobile });
    }

    return { duplicates: matches };
  }

  async getTimeline(tenantId: string, id: string) {
    return this.prisma.activity.findMany({
      where: { tenantId, entity: 'Lead', entityId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, type: true, subject: true, content: true, metadata: true, createdAt: true },
    });
  }

  private async autoAssign(tenantId: string, lead: any) {
    if (lead.assignedToId || !lead.serviceType) return;
    const setting = await this.prisma.tenantSetting.findUnique({
      where: { tenantId_key: { tenantId, key: 'autoAssignRules' } },
    }).catch(() => null);
    if (!setting?.value) return;
    const rules = (setting.value as any)?.rules || [];
    const match = rules.find((r: any) => r.serviceType === lead.serviceType || r.source === lead.source);
    if (match?.assignToUserId) {
      await this.prisma.lead.update({
        where: { id: lead.id },
        data: { assignedToId: match.assignToUserId },
      });
      await this.activity.log(tenantId, match.assignToUserId, 'LEAD_AUTO_ASSIGNED', `Lead auto-assigned: ${lead.fullName}`, 'Lead', lead.id, lead.branchId);
    }
  }
}
