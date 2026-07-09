import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ActivityService } from '../activity/activity.service';
import { LookupValidationService } from '../master-data/lookup-validation.service';
import { validateStatusTransition } from '../../common/utils/status-transitions';
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
    const lead = await this.prisma.lead.create({
      data: { tenantId, status: dto.status ?? 'NEW', priority: dto.priority ?? 'MEDIUM', ...data },
    });
    await this.audit.logMutation(actorId, tenantId, 'LEAD', 'Lead', lead.id, 'CREATE', { fullName: lead.fullName }, lead.branchId ?? undefined);
    await this.activity.log(tenantId, actorId, 'LEAD_CREATED', `New lead: ${lead.fullName}`, 'Lead', lead.id, lead.branchId);
    return lead;
  }

  async findAll(tenantId: string, query: QueryLeadDto) {
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
    }

    const data = this.mapDateFields(dto);
    const lead = await this.prisma.lead.update({ where: { id }, data });
    await this.audit.logMutation(actorId, tenantId, 'LEAD', 'Lead', lead.id, 'UPDATE', { changes: dto }, lead.branchId ?? undefined);
    await this.activity.log(tenantId, actorId, 'LEAD_UPDATED', `Lead updated: ${lead.fullName}`, 'Lead', lead.id, lead.branchId);
    return lead;
  }

  async convertToClient(tenantId: string, actorId: string, id: string) {
    const lead = await this.findById(tenantId, id);
    const client = await this.prisma.client.create({
      data: {
        tenantId, branchId: lead.branchId, displayName: lead.fullName,
        email: lead.email, phone: lead.primaryMobile, type: 'PERSON', status: 'ACTIVE',
        leadSource: lead.source, nationalityLabel: lead.nationalityId,
      },
    });
    await this.prisma.lead.update({ where: { id }, data: { status: 'WON', clientId: client.id } });
    await this.audit.logMutation(actorId, tenantId, 'LEAD', 'Lead', lead.id, 'UPDATE', { convertedToClientId: client.id }, lead.branchId ?? undefined);
    await this.activity.log(tenantId, actorId, 'LEAD_CONVERTED', `Lead converted to client: ${client.displayName}`, 'Client', client.id, lead.branchId);
    return client;
  }

  async remove(tenantId: string, actorId: string, id: string) {
    const lead = await this.findById(tenantId, id);
    await this.prisma.lead.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.logMutation(actorId, tenantId, 'LEAD', 'Lead', lead.id, 'DELETE', { fullName: lead.fullName }, lead.branchId ?? undefined);
    return { id, deleted: true };
  }
}
