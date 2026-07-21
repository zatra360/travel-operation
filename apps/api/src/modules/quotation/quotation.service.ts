import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { enforceBranchScope } from '../../common/utils/scope';
import { AuditService } from '../audit/audit.service';
import { ActivityService } from '../activity/activity.service';
import { RelationshipValidationService } from '../../common/services/relationship-validation.service';
import { LookupValidationService } from '../master-data/lookup-validation.service';
import { NumberGeneratorService } from '../../common/services/number-generator.service';
import { validateStatusTransition } from '../../common/utils/status-transitions';
import { NotificationService } from '../notification/notification.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { QueryQuotationDto } from './dto/query-quotation.dto';
import { CreateQuotationLineItemDto } from './dto/create-quotation-line-item.dto';
import { UpdateQuotationLineItemDto } from './dto/update-quotation-line-item.dto';
import { resolveServiceTypeRef } from '../service-ops/service-type-map';

const TERMINAL_STATUSES = ['BOOKING_CREATED', 'CANCELLED'];

@Injectable()
export class QuotationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly activity: ActivityService,
    private readonly relValidation: RelationshipValidationService,
    private readonly lookup: LookupValidationService,
    private readonly numberGen: NumberGeneratorService,
    private readonly notification: NotificationService,
  ) {}

  async create(tenantId: string, actorId: string, dto: CreateQuotationDto) {
    await this.relValidation.validateLinkedEntities({
      tenantId, clientId: dto.clientId, leadId: dto.leadId,
      assignedToId: dto.assignedToId, branchId: dto.branchId,
    });
    await this.lookup.validateMultiple(tenantId, [
      { categoryCode: 'quotation-status', code: dto.status ?? 'DRAFT' },
    ].filter((v) => v.code));

    const quoteNumber = dto.quoteNumber || (await this.numberGen.generateQuoteNumber(tenantId));

    const quotation = await this.prisma.quotation.create({
      data: {
        tenantId, branchId: dto.branchId ?? null, quoteNumber, status: 'DRAFT',
        title: dto.title ?? null, clientId: dto.clientId ?? null, leadId: dto.leadId ?? null,
        assignedToId: dto.assignedToId ?? null, currencyCode: dto.currencyCode ?? 'USD',
        subtotal: 0, taxTotal: 0, discountTotal: 0, grandTotal: 0,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        notes: dto.notes ?? null, terms: dto.terms ?? null, createdById: actorId,
      },
    });

    await this.prisma.quotationStatusLog.create({
      data: { tenantId, quotationId: quotation.id, toStatus: quotation.status, actorId, note: 'Quotation created' },
    });

    if (dto.leadId) {
      await this.prisma.lead.update({
        where: { id: dto.leadId },
        data: {
          quoteCount: { increment: 1 },
          lastQuoteId: quotation.id,
          lastQuoteStatus: 'DRAFT',
          lastQuoteAmount: 0,
        },
      });
    }

    await this.audit.logMutation(actorId, tenantId, 'QUOTATION', 'Quotation', quotation.id, 'CREATE', { quoteNumber });
    await this.activity.logEntityEvent({
      tenantId, userId: actorId, type: 'QUOTATION_CREATED',
      subject: `Quotation ${quoteNumber} created`, entity: 'Quotation', entityId: quotation.id,
      branchId: quotation.branchId,
    });

    return quotation;
  }

  async findAll(tenantId: string, query: QueryQuotationDto, activeBranchId?: string) {
    const page = query.page ?? 1; const limit = query.limit ?? 50; const skip = (page - 1) * limit;
    const where: any = { tenantId, deletedAt: null };
    if (query.status) where.status = query.status;
    if (query.clientId) where.clientId = query.clientId;
    if (query.leadId) where.leadId = query.leadId;
    if (query.assignedToId) where.assignedToId = query.assignedToId;
    if (query.branchId) where.branchId = query.branchId;
    if (query.search) {
      where.OR = [
        { quoteNumber: { contains: query.search, mode: 'insensitive' } },
        { title: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    enforceBranchScope(where, activeBranchId);
    const [data, total] = await Promise.all([
      this.prisma.quotation.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit, include: { client: { select: { displayName: true } }, lead: { select: { fullName: true } } } }),
      this.prisma.quotation.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(tenantId: string, id: string, includeDetails = false) {
    const quotation = includeDetails
      ? await this.prisma.quotation.findFirst({
          where: { id, tenantId, deletedAt: null },
          include: {
            lineItems: { orderBy: { sortOrder: 'asc' as const } },
            revisions: { orderBy: { createdAt: 'desc' as const } },
            statusLogs: { orderBy: { createdAt: 'desc' as const } },
            client: { select: { id: true, displayName: true, email: true, phone: true } },
            lead: { select: { id: true, fullName: true, status: true } },
            assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
            branch: { select: { id: true, name: true } },
          },
        })
      : await this.prisma.quotation.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!quotation) throw new NotFoundException('Quotation not found');
    return quotation;
  }

  async getTimeline(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    return this.activity.findByEntity(tenantId, 'Quotation', id);
  }

  async update(tenantId: string, actorId: string, id: string, dto: UpdateQuotationDto) {
    const current = await this.findById(tenantId, id);

    if (dto.clientId !== undefined || dto.leadId !== undefined || dto.assignedToId !== undefined || dto.branchId !== undefined) {
      await this.relValidation.validateLinkedEntities({
        tenantId,
        clientId: dto.clientId ?? current.clientId ?? undefined,
        leadId: dto.leadId ?? current.leadId ?? undefined,
        assignedToId: dto.assignedToId ?? current.assignedToId ?? undefined,
        branchId: dto.branchId ?? current.branchId ?? undefined,
      });
    }

    const oldStatus = current.status;
    if (dto.status && dto.status !== current.status) {
      await this.lookup.validate(tenantId, 'quotation-status', dto.status);
      const check = validateStatusTransition('quotation', current.status, dto.status);
      if (!check.valid) {
        throw new BadRequestException(
          `Invalid transition from ${current.status} to ${dto.status}. Allowed: ${check.allowed.join(', ') || 'none'}`,
        );
      }
    }

    const shouldCreateRevision = (dto.status && dto.status !== oldStatus && dto.status !== 'DRAFT');
    if (shouldCreateRevision) {
      await this.createRevisionSnapshot(tenantId, actorId, current);
    }

    const timestampUpdates = this.buildStatusTimestamps(dto.status, oldStatus);

    const quotation = await this.prisma.quotation.update({
      where: { id },
      data: {
        ...(dto.quoteNumber !== undefined && { quoteNumber: dto.quoteNumber }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.clientId !== undefined && { clientId: dto.clientId }),
        ...(dto.leadId !== undefined && { leadId: dto.leadId }),
        ...(dto.assignedToId !== undefined && { assignedToId: dto.assignedToId }),
        ...(dto.currencyCode !== undefined && { currencyCode: dto.currencyCode }),
        ...(dto.validUntil !== undefined && { validUntil: dto.validUntil ? new Date(dto.validUntil) : null }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.terms !== undefined && { terms: dto.terms }),
        ...(dto.branchId !== undefined && { branchId: dto.branchId }),
        ...timestampUpdates,
        updatedById: actorId,
      },
    });

    if (dto.status && dto.status !== oldStatus) {
      await this.prisma.quotationStatusLog.create({
        data: {
          tenantId, quotationId: id, fromStatus: oldStatus, toStatus: dto.status,
          actorId, note: dto.notes ?? 'Status changed',
        },
      });
      await this.activity.logEntityEvent({
        tenantId, userId: actorId, type: 'QUOTATION_STATUS_CHANGED',
        subject: `Quotation ${quotation.quoteNumber}: ${oldStatus} -> ${dto.status}`,
        entity: 'Quotation', entityId: id, branchId: quotation.branchId,
      });

      if (quotation.leadId) {
        await this.prisma.lead.update({
          where: { id: quotation.leadId },
          data: {
            lastQuoteStatus: dto.status,
            lastQuoteAmount: quotation.grandTotal,
            ...(dto.status === 'SENT' ? { status: 'QUOTATION_SENT' } : {}),
          },
        });
      }
    }

    await this.audit.logMutation(
      actorId, tenantId, 'QUOTATION', 'Quotation', id,
      dto.status !== oldStatus ? 'STATUS_CHANGE' : 'UPDATE',
      { changes: dto },
    );

    return quotation;
  }

  private buildStatusTimestamps(newStatus: string | undefined, oldStatus: string) {
    const now = new Date();
    const ts: Record<string, Date | null> = {};
    if (!newStatus || newStatus === oldStatus) return ts;
    if (newStatus === 'SENT') ts.sentAt = now;
    if (newStatus === 'VIEWED') ts.viewedAt = now;
    if (newStatus === 'ACCEPTED') ts.acceptedAt = now;
    if (newStatus === 'REJECTED') ts.rejectedAt = now;
    if (newStatus === 'EXPIRED') ts.expiredAt = now;
    if (newStatus === 'CANCELLED') ts.cancelledAt = now;
    if (newStatus === 'BOOKING_CREATED') ts.bookingCreatedAt = now;
    if (newStatus === 'DRAFT') {
      ts.rejectedAt = null;
      ts.expiredAt = null;
    }
    return ts;
  }

  async addLineItem(tenantId: string, actorId: string, quotationId: string, dto: CreateQuotationLineItemDto) {
    const quotation = await this.findById(tenantId, quotationId);
    this.assertLineItemEditable(quotation);
    const serviceTypeRef = await resolveServiceTypeRef(this.prisma, dto.serviceType);

    const item = await this.prisma.$transaction(async (tx) => {
      const newItem = await tx.quotationLineItem.create({
        data: {
          tenantId, quotationId,
          serviceType: serviceTypeRef.code ?? null,
          serviceTypeId: serviceTypeRef.id,
          title: dto.title,
          description: dto.description ?? null,
          quantity: dto.quantity ?? 1,
          unitPrice: dto.unitPrice ?? 0,
          taxAmount: dto.taxAmount ?? 0,
          discountAmount: dto.discountAmount ?? 0,
          lineTotal: this.computeLineTotal(dto.quantity ?? 1, dto.unitPrice ?? 0, dto.taxAmount ?? 0, dto.discountAmount ?? 0),
          airlineId: dto.airlineId ?? null,
          originAirportId: dto.originAirportId ?? null,
          destAirportId: dto.destAirportId ?? null,
          routeId: dto.routeId ?? null,
          sortOrder: dto.sortOrder ?? 0,
          metadata: dto.metadata ?? {},
        },
      });

      await this.calculateTotalsTx(tx, quotationId);
      return newItem;
    });

    await this.activity.logEntityEvent({
      tenantId, userId: actorId, type: 'QUOTATION_LINE_ITEM_CREATED',
      subject: `Line item "${item.title}" added to ${quotation.quoteNumber}`,
      entity: 'Quotation', entityId: quotationId,
    });
    await this.audit.logMutation(actorId, tenantId, 'QUOTATION', 'QuotationLineItem', item.id, 'CREATE', { title: item.title });

    return item;
  }

  async updateLineItem(tenantId: string, actorId: string, quotationId: string, lineItemId: string, dto: UpdateQuotationLineItemDto) {
    const quotation = await this.findById(tenantId, quotationId);
    this.assertLineItemEditable(quotation);

    const existing = await this.prisma.quotationLineItem.findFirst({
      where: { id: lineItemId, quotationId, tenantId },
    });
    if (!existing) throw new NotFoundException('Line item not found');

    const quantity = dto.quantity ?? existing.quantity;
    const unitPrice = dto.unitPrice ?? Number(existing.unitPrice);
    const taxAmount = dto.taxAmount ?? Number(existing.taxAmount ?? 0);
    const discountAmount = dto.discountAmount ?? Number(existing.discountAmount ?? 0);

    const before = { quantity: existing.quantity, unitPrice: Number(existing.unitPrice), title: existing.title };
    const serviceTypeRef = dto.serviceType !== undefined ? await resolveServiceTypeRef(this.prisma, dto.serviceType) : null;

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.quotationLineItem.update({
        where: { id: lineItemId },
        data: {
          ...(serviceTypeRef !== null && { serviceType: serviceTypeRef.code, serviceTypeId: serviceTypeRef.id }),
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.quantity !== undefined && { quantity: dto.quantity }),
          ...(dto.unitPrice !== undefined && { unitPrice: dto.unitPrice }),
          taxAmount,
          discountAmount,
          lineTotal: this.computeLineTotal(quantity, unitPrice, taxAmount, discountAmount),
          ...(dto.airlineId !== undefined && { airlineId: dto.airlineId }),
          ...(dto.originAirportId !== undefined && { originAirportId: dto.originAirportId }),
          ...(dto.destAirportId !== undefined && { destAirportId: dto.destAirportId }),
          ...(dto.routeId !== undefined && { routeId: dto.routeId }),
          ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
          ...(dto.metadata !== undefined && { metadata: dto.metadata }),
        },
      });

      await this.calculateTotalsTx(tx, quotationId);
      return result;
    });

    await this.activity.logEntityEvent({
      tenantId, userId: actorId, type: 'QUOTATION_LINE_ITEM_UPDATED',
      subject: `Line item "${updated.title}" updated in ${quotation.quoteNumber}`,
      entity: 'Quotation', entityId: quotationId,
    });
    await this.audit.logMutation(actorId, tenantId, 'QUOTATION', 'QuotationLineItem', lineItemId, 'UPDATE', { before, after: dto });

    return updated;
  }

  async removeLineItem(tenantId: string, actorId: string, quotationId: string, lineItemId: string) {
    const quotation = await this.findById(tenantId, quotationId);
    this.assertLineItemEditable(quotation);

    const existing = await this.prisma.quotationLineItem.findFirst({
      where: { id: lineItemId, quotationId, tenantId },
    });
    if (!existing) throw new NotFoundException('Line item not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.quotationLineItem.delete({ where: { id: lineItemId } });
      await this.calculateTotalsTx(tx, quotationId);
    });

    await this.activity.logEntityEvent({
      tenantId, userId: actorId, type: 'QUOTATION_LINE_ITEM_DELETED',
      subject: `Line item "${existing.title}" removed from ${quotation.quoteNumber}`,
      entity: 'Quotation', entityId: quotationId,
    });
    await this.audit.logMutation(actorId, tenantId, 'QUOTATION', 'QuotationLineItem', lineItemId, 'DELETE', { title: existing.title });

    return { id: lineItemId, deleted: true };
  }

  async reorderLineItems(tenantId: string, actorId: string, quotationId: string, itemIds: string[]) {
    const quotation = await this.findById(tenantId, quotationId);
    this.assertLineItemEditable(quotation);

    await this.prisma.$transaction(
      itemIds.map((id, index) =>
        this.prisma.quotationLineItem.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );

    await this.activity.logEntityEvent({
      tenantId, userId: actorId, type: 'QUOTATION_LINE_ITEM_REORDERED',
      subject: `Line items reordered in ${quotation.quoteNumber}`,
      entity: 'Quotation', entityId: quotationId,
    });

    return { success: true };
  }

  private assertLineItemEditable(quotation: any) {
    if (TERMINAL_STATUSES.includes(quotation.status)) {
      throw new BadRequestException(`Cannot modify line items on a ${quotation.status.toLowerCase()} quotation`);
    }
    if (quotation.status === 'ACCEPTED') {
      throw new BadRequestException('Cannot modify line items on an accepted quotation');
    }
  }

  private computeLineTotal(quantity: number, unitPrice: number, taxAmount: number, discountAmount: number): number {
    const base = quantity * unitPrice;
    return Math.round((base + taxAmount - discountAmount) * 10000) / 10000;
  }

  private async calculateTotalsTx(tx: any, quotationId: string) {
    const items = await tx.quotationLineItem.findMany({ where: { quotationId } });
    const subtotal = items.reduce((sum: number, i: any) => {
      const base = Number(i.quantity) * Number(i.unitPrice);
      return sum + Math.round(base * 10000) / 10000;
    }, 0);
    const taxTotal = items.reduce((sum: number, i: any) => sum + Number(i.taxAmount ?? 0), 0);
    const discountTotal = items.reduce((sum: number, i: any) => sum + Number(i.discountAmount ?? 0), 0);
    const grandTotal = Math.round((subtotal + taxTotal - discountTotal) * 10000) / 10000;

    await tx.quotation.update({
      where: { id: quotationId },
      data: { subtotal, taxTotal, discountTotal, grandTotal },
    });
  }

  private async createRevisionSnapshot(tenantId: string, actorId: string, quotation: any) {
    const revisionNumber = (quotation.currentRevision ?? 1) + 1;
    const snapshot = {
      quoteNumber: quotation.quoteNumber,
      title: quotation.title,
      status: quotation.status,
      clientId: quotation.clientId,
      leadId: quotation.leadId,
      assignedToId: quotation.assignedToId,
      currencyCode: quotation.currencyCode,
      subtotal: Number(quotation.subtotal),
      taxTotal: Number(quotation.taxTotal),
      discountTotal: Number(quotation.discountTotal),
      grandTotal: Number(quotation.grandTotal),
      validUntil: quotation.validUntil,
      notes: quotation.notes,
      terms: quotation.terms,
      branchId: quotation.branchId,
    };

    await this.prisma.$transaction([
      this.prisma.quotationRevision.create({
        data: {
          tenantId, quotationId: quotation.id, revisionNumber,
          summary: `Revision ${revisionNumber}`,
          snapshot,
          createdById: actorId,
        },
      }),
      this.prisma.quotation.update({
        where: { id: quotation.id },
        data: { currentRevision: revisionNumber },
      }),
    ]);

    await this.activity.logEntityEvent({
      tenantId, userId: actorId, type: 'QUOTATION_REVISION_CREATED',
      subject: `Revision ${revisionNumber} created for ${quotation.quoteNumber}`,
      entity: 'Quotation', entityId: quotation.id,
    });
  }

  async send(tenantId: string, actorId: string, id: string) {
    const quotation = await this.findById(tenantId, id);
    const check = validateStatusTransition('quotation', quotation.status, 'SENT');
    if (!check.valid) {
      throw new BadRequestException(`Cannot send a quotation in ${quotation.status} status`);
    }
    const hash = quotation.publicHash || this.generateHash();
    const updated = await this.update(tenantId, actorId, id, {
      status: 'SENT',
      publicHash: hash,
      sendStatus: 'SENT',
    });

    if (quotation.clientId) {
      const client = await this.prisma.client.findFirst({
        where: { id: quotation.clientId, tenantId },
        select: { email: true, displayName: true },
      });
      if (client?.email) {
        const webOrigin = process.env.WEB_ORIGIN || 'http://localhost:3901';
        const link = `${webOrigin}/quote/${hash}`;
        const grandTotal = Number(quotation.grandTotal).toFixed(2);
        this.notification.notify({
          tenantId, userId: actorId,
          channel: 'EMAIL',
          title: `Quotation ${quotation.quoteNumber} from Travel Operation`,
          body: `
            <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
              <div style="background:#6366f1;color:#fff;padding:24px;text-align:center">
                <h1 style="margin:0;font-size:20px">Travel Operation</h1>
                <p style="margin:4px 0 0;font-size:14px;opacity:0.9">Official Quotation</p>
              </div>
              <div style="padding:24px">
                <p style="font-size:16px;color:#1e293b">Dear ${client.displayName},</p>
                <p style="font-size:14px;color:#475569;line-height:1.6">
                  Your quotation <strong>#${quotation.quoteNumber}</strong> for <strong>${grandTotal} ${quotation.currencyCode}</strong> is ready for review.
                </p>
                <div style="text-align:center;margin:28px 0">
                  <a href="${link}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600">View Quotation</a>
                </div>
                <p style="font-size:13px;color:#94a3b8">Or copy this link: ${link}</p>
                <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0" />
                <p style="font-size:12px;color:#94a3b8;text-align:center">This quotation is valid until ${quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString() : 'expiry date not set'}.</p>
              </div>
            </div>`,
          userEmail: client.email,
        }).catch(() => {});
      }
    }

    return updated;
  }

  async regeneratePublicHash(tenantId: string, actorId: string, id: string) {
    const quotation = await this.findById(tenantId, id);
    const hash = this.generateHash();
    return this.prisma.quotation.update({ where: { id: quotation.id }, data: { publicHash: hash } });
  }

  async setSignatureRequired(tenantId: string, id: string, required: boolean) {
    const quotation = await this.findById(tenantId, id);
    return this.prisma.quotation.update({
      where: { id: quotation.id },
      data: { signatureRequired: required },
    });
  }

  async getSignature(tenantId: string, id: string) {
    const quotation = await this.findById(tenantId, id);
    return this.prisma.quotationSign.findUnique({ where: { quotationId: quotation.id } });
  }

  private generateHash(): string {
    return randomBytes(16).toString('hex');
  }

  async accept(tenantId: string, actorId: string, id: string) {
    const quotation = await this.prisma.quotation.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { lineItems: true },
    });
    if (!quotation) throw new NotFoundException('Quotation not found');
    if (quotation.lineItems.length === 0) {
      throw new BadRequestException('Cannot accept a quotation with no line items');
    }
    return this.update(tenantId, actorId, id, { status: 'ACCEPTED' });
  }

  async view(tenantId: string, actorId: string, id: string) {
    const quotation = await this.findById(tenantId, id);
    const check = validateStatusTransition('quotation', quotation.status, 'VIEWED');
    if (!check.valid) {
      throw new BadRequestException(`Cannot mark quotation as viewed in ${quotation.status} status`);
    }
    return this.update(tenantId, actorId, id, { status: 'VIEWED' });
  }

  async reject(tenantId: string, actorId: string, id: string) {
    return this.update(tenantId, actorId, id, { status: 'REJECTED' });
  }

  async cancel(tenantId: string, actorId: string, id: string) {
    return this.update(tenantId, actorId, id, { status: 'CANCELLED' });
  }

  async reopen(tenantId: string, actorId: string, id: string) {
    const quotation = await this.findById(tenantId, id);
    const check = validateStatusTransition('quotation', quotation.status, 'DRAFT');
    if (!check.valid) {
      throw new BadRequestException(`Cannot reopen a quotation in ${quotation.status} status`);
    }
    return this.update(tenantId, actorId, id, { status: 'DRAFT' });
  }

  async convertToBooking(tenantId: string, actorId: string, quotationId: string) {
    const quotation = await this.prisma.quotation.findFirst({
      where: { id: quotationId, tenantId, deletedAt: null },
      include: { lineItems: true, client: { select: { displayName: true } }, lead: { select: { preferredTravelDate: true } } },
    });
    if (!quotation) throw new NotFoundException('Quotation not found');
    if (quotation.status !== 'ACCEPTED') {
      throw new BadRequestException('Only accepted quotations can be converted to bookings');
    }
    if (!quotation.clientId) {
      throw new BadRequestException('Quotation must be linked to a client for booking conversion');
    }

    const bookingRef = await this.numberGen.generateBookingRef(tenantId);

    const booking = await this.prisma.booking.create({
      data: {
        tenantId,
        branchId: quotation.branchId,
        bookingRef,
        status: 'HELD',
        clientId: quotation.clientId,
        quotationId,
        leadId: quotation.leadId,
        assignedToId: quotation.assignedToId,
        notes: `Created from quotation ${quotation.quoteNumber}`,
        travelStart: quotation.lead?.preferredTravelDate ? new Date(quotation.lead.preferredTravelDate) : null,
        createdById: actorId,
      },
    });

    const flightItems = quotation.lineItems.filter(item => item.airlineId || item.originAirportId || item.destAirportId);
    for (let i = 0; i < flightItems.length; i++) {
      const item = flightItems[i];
      await this.prisma.bookingSegment.create({
        data: {
          tenantId, bookingId: booking.id,
          segmentType: 'FLIGHT',
          airlineId: item.airlineId ?? undefined,
          originAirportId: item.originAirportId ?? undefined,
          destAirportId: item.destAirportId ?? undefined,
          status: 'CONFIRMED',
          notes: item.description,
          sortOrder: i + 1,
        },
      });
    }

    if (quotation.client?.displayName) {
      await this.prisma.bookingPassenger.create({
        data: {
          tenantId, bookingId: booking.id,
          passengerType: 'ADULT',
          firstName: quotation.client.displayName.split(' ')[0] || quotation.client.displayName,
          lastName: quotation.client.displayName.split(' ').slice(1).join(' ') || '',
          sortOrder: 1,
        },
      });
    }

    await this.prisma.bookingStatusLog.create({
      data: { tenantId, bookingId: booking.id, toStatus: 'HELD', actorId, note: 'Created from quotation' },
    });

    await this.update(tenantId, actorId, quotationId, { status: 'BOOKING_CREATED' });

    await this.activity.logEntityEvent({
      tenantId, userId: actorId, type: 'BOOKING_CREATED',
      subject: `Booking ${bookingRef} created from quotation ${quotation.quoteNumber}`,
      entity: 'Booking', entityId: booking.id, branchId: booking.branchId,
    });

    return booking;
  }

  async convertToInvoice(tenantId: string, actorId: string, quotationId: string) {
    const quotation = await this.prisma.quotation.findFirst({
      where: { id: quotationId, tenantId, deletedAt: null },
      include: { lineItems: true },
    });
    if (!quotation) throw new NotFoundException('Quotation not found');
    if (!quotation.clientId) throw new BadRequestException('Quotation must be linked to a client');

    const invoiceNumber = await this.numberGen.generateInvoiceNumber(tenantId);

    const invoice = await this.prisma.invoice.create({
      data: {
        tenantId, branchId: quotation.branchId, invoiceNumber, clientId: quotation.clientId,
        quotationId, currencyCode: quotation.currencyCode,
        subtotal: quotation.subtotal, taxAmount: quotation.taxTotal,
        discountAmount: quotation.discountTotal, totalAmount: quotation.grandTotal,
        dueAmount: quotation.grandTotal, status: 'DRAFT',
        createdById: actorId,
      },
    });

    for (const item of quotation.lineItems) {
      await this.prisma.invoiceLine.create({
        data: {
          tenantId, invoiceId: invoice.id, serviceType: item.serviceType,
          serviceTypeId: item.serviceTypeId,
          description: item.description, quantity: item.quantity,
          unitPrice: item.unitPrice, lineTotal: item.lineTotal,
          metadata: item.metadata ?? undefined, sortOrder: item.sortOrder,
        },
      });
    }

    await this.activity.logEntityEvent({
      tenantId, userId: actorId, type: 'INVOICE_CREATED',
      subject: `Invoice ${invoiceNumber} created from quotation ${quotation.quoteNumber}`,
      entity: 'Quotation', entityId: quotationId,
    });

    return invoice;
  }

  async getRevisionHistory(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    return this.prisma.quotationRevision.findMany({
      where: { tenantId, quotationId: id },
      orderBy: { revisionNumber: 'desc' },
    });
  }

  async remove(tenantId: string, actorId: string, id: string) {
    const quotation = await this.findById(tenantId, id);
    await this.prisma.quotation.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.logMutation(actorId, tenantId, 'QUOTATION', 'Quotation', id, 'DELETE', { quoteNumber: quotation.quoteNumber });
    return { id, deleted: true };
  }
}
