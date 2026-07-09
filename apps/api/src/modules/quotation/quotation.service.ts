import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ActivityService } from '../activity/activity.service';
import { RelationshipValidationService } from '../../common/services/relationship-validation.service';
import { NumberGeneratorService } from '../../common/services/number-generator.service';
import { validateStatusTransition } from '../../common/utils/status-transitions';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { QueryQuotationDto } from './dto/query-quotation.dto';

@Injectable()
export class QuotationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly activity: ActivityService,
    private readonly relValidation: RelationshipValidationService,
    private readonly numberGen: NumberGeneratorService,
  ) {}

  async create(tenantId: string, actorId: string, dto: CreateQuotationDto) {
    await this.relValidation.validateLinkedEntities({
      tenantId, clientId: dto.clientId, leadId: dto.leadId,
      assignedToId: dto.assignedToId, branchId: dto.branchId,
    });

    const quoteNumber = dto.quoteNumber || (await this.numberGen.generateQuoteNumber(tenantId));

    const quotation = await this.prisma.quotation.create({
      data: {
        tenantId, branchId: dto.branchId ?? null, quoteNumber, status: dto.status ?? 'DRAFT',
        title: dto.title ?? null, clientId: dto.clientId ?? null, leadId: dto.leadId ?? null,
        assignedToId: dto.assignedToId ?? null, currencyCode: dto.currencyCode ?? 'USD',
        subtotal: dto.subtotal ?? 0, taxTotal: dto.taxTotal ?? 0,
        discountTotal: dto.discountTotal ?? 0, grandTotal: dto.grandTotal ?? 0,
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
          lastQuoteStatus: quotation.status,
          lastQuoteAmount: quotation.grandTotal,
          status: 'QUOTATION_SENT',
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

  async findAll(tenantId: string, query: QueryQuotationDto) {
    const page = query.page ?? 1; const limit = query.limit ?? 50; const skip = (page - 1) * limit;
    const where: any = { tenantId, deletedAt: null };
    if (query.status) where.status = query.status;
    if (query.clientId) where.clientId = query.clientId;
    if (query.assignedToId) where.assignedToId = query.assignedToId;
    if (query.branchId) where.branchId = query.branchId;
    if (query.search) {
      where.OR = [
        { quoteNumber: { contains: query.search, mode: 'insensitive' } },
        { title: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.quotation.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.prisma.quotation.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(tenantId: string, id: string, includeDetails = false) {
    const quotation = includeDetails
      ? await this.prisma.quotation.findFirst({
          where: { id, tenantId, deletedAt: null },
          include: { lineItems: { orderBy: { sortOrder: 'asc' as const } }, revisions: { orderBy: { createdAt: 'desc' as const } }, statusLogs: { orderBy: { createdAt: 'desc' as const } } },
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
    await this.relValidation.validateLinkedEntities({
      tenantId, clientId: dto.clientId, leadId: dto.leadId,
      assignedToId: dto.assignedToId, branchId: dto.branchId,
    });

    const oldStatus = current.status;
    if (dto.status && dto.status !== current.status) {
      const check = validateStatusTransition('quotation', current.status, dto.status);
      if (!check.valid) {
        throw new BadRequestException(`Invalid transition from ${current.status} to ${dto.status}. Allowed: ${check.allowed.join(', ') || 'none'}`);
      }
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
        ...(dto.subtotal !== undefined && { subtotal: dto.subtotal }),
        ...(dto.taxTotal !== undefined && { taxTotal: dto.taxTotal }),
        ...(dto.discountTotal !== undefined && { discountTotal: dto.discountTotal }),
        ...(dto.grandTotal !== undefined && { grandTotal: dto.grandTotal }),
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
        data: { tenantId, quotationId: id, fromStatus: oldStatus, toStatus: dto.status, actorId, note: dto.notes ?? `Status changed` },
      });
      await this.activity.logEntityEvent({
        tenantId, userId: actorId, type: 'QUOTATION_STATUS_CHANGED',
        subject: `Quotation ${quotation.quoteNumber}: ${oldStatus} -> ${dto.status}`,
        entity: 'Quotation', entityId: id, branchId: quotation.branchId,
      });

      if (quotation.leadId) {
        await this.prisma.lead.update({
          where: { id: quotation.leadId },
          data: { lastQuoteStatus: dto.status, lastQuoteAmount: quotation.grandTotal },
        });
      }
    }

    await this.audit.logMutation(actorId, tenantId, 'QUOTATION', 'Quotation', id, dto.status !== oldStatus ? 'STATUS_CHANGE' : 'UPDATE', { changes: dto });

    return quotation;
  }

  private buildStatusTimestamps(newStatus: string | undefined, oldStatus: string) {
    const now = new Date();
    const ts: Record<string, Date> = {};
    if (!newStatus || newStatus === oldStatus) return ts;
    if (newStatus === 'SENT') ts.sentAt = now;
    if (newStatus === 'VIEWED') ts.viewedAt = now;
    if (newStatus === 'ACCEPTED') ts.acceptedAt = now;
    if (newStatus === 'REJECTED') ts.rejectedAt = now;
    if (newStatus === 'EXPIRED') ts.expiredAt = now;
    if (newStatus === 'CANCELLED') ts.cancelledAt = now;
    if (newStatus === 'BOOKING_CREATED') ts.bookingCreatedAt = now;
    return ts;
  }

  async addLineItem(tenantId: string, actorId: string, quotationId: string, dto: any) {
    const quotation = await this.findById(tenantId, quotationId);
    if (quotation.status === 'ACCEPTED' || quotation.status === 'BOOKING_CREATED') {
      throw new BadRequestException('Cannot modify line items on an accepted quotation');
    }

    const item = await this.prisma.quotationLineItem.create({
      data: {
        tenantId, quotationId, serviceType: dto.serviceType, title: dto.title, description: dto.description,
        quantity: dto.quantity ?? 1, unitPrice: dto.unitPrice ?? 0, lineTotal: (dto.quantity ?? 1) * (dto.unitPrice ?? 0),
        airlineId: dto.airlineId, originAirportId: dto.originAirportId, destAirportId: dto.destAirportId,
        routeId: dto.routeId, sortOrder: dto.sortOrder ?? 0,
      },
    });

    await this.calculateTotals(quotationId);
    await this.activity.logEntityEvent({
      tenantId, userId: actorId, type: 'QUOTATION_LINE_ADDED',
      subject: `Line item added to ${quotation.quoteNumber}`, entity: 'Quotation', entityId: quotationId,
    });

    return item;
  }

  async removeLineItem(tenantId: string, actorId: string, quotationId: string, lineItemId: string) {
    const quotation = await this.findById(tenantId, quotationId);
    if (quotation.status === 'ACCEPTED' || quotation.status === 'BOOKING_CREATED') {
      throw new BadRequestException('Cannot modify line items on an accepted quotation');
    }
    await this.prisma.quotationLineItem.delete({ where: { id: lineItemId } });
    await this.calculateTotals(quotationId);
    return { id: lineItemId, deleted: true };
  }

  private async calculateTotals(quotationId: string) {
    const items = await this.prisma.quotationLineItem.findMany({ where: { quotationId } });
    const subtotal = items.reduce((sum, i) => sum + Number(i.lineTotal), 0);
    const taxTotal = Math.round(subtotal * 0.05 * 100) / 100;
    const grandTotal = subtotal + taxTotal;
    await this.prisma.quotation.update({
      where: { id: quotationId },
      data: { subtotal, taxTotal, discountTotal: 0, grandTotal },
    });
  }

  async send(tenantId: string, actorId: string, id: string) {
    return this.update(tenantId, actorId, id, { status: 'SENT' } as any);
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
    return this.update(tenantId, actorId, id, { status: 'ACCEPTED' } as any);
  }

  async reject(tenantId: string, actorId: string, id: string) {
    return this.update(tenantId, actorId, id, { status: 'REJECTED' } as any);
  }

  async cancel(tenantId: string, actorId: string, id: string) {
    return this.update(tenantId, actorId, id, { status: 'CANCELLED' } as any);
  }

  async convertToBooking(tenantId: string, actorId: string, quotationId: string) {
    const quotation = await this.prisma.quotation.findFirst({
      where: { id: quotationId, tenantId, deletedAt: null },
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
        travelStart: quotation.validUntil ?? undefined,
        notes: `Created from quotation ${quotation.quoteNumber}`,
        createdById: actorId,
      },
    });

    await this.prisma.bookingStatusLog.create({
      data: { tenantId, bookingId: booking.id, toStatus: 'HELD', actorId, note: 'Created from quotation' },
    });

    await this.update(tenantId, actorId, quotationId, { status: 'BOOKING_CREATED' } as any);

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
