import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { enforceBranchScope } from '../../common/utils/scope';
import { AuditService } from '../audit/audit.service';
import { ActivityService } from '../activity/activity.service';
import { RelationshipValidationService } from '../../common/services/relationship-validation.service';
import { NumberGeneratorService } from '../../common/services/number-generator.service';
import { LookupValidationService } from '../master-data/lookup-validation.service';
import { validateStatusTransition } from '../../common/utils/status-transitions';
import { NotificationService } from '../notification/notification.service';
import { ClientScoringService } from '../client/client-scoring.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { QueryBookingDto } from './dto/query-booking.dto';
import { CreateItineraryDayDto, UpdateItineraryDayDto } from './dto/itinerary.dto';

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly activity: ActivityService,
    private readonly relValidation: RelationshipValidationService,
    private readonly numberGen: NumberGeneratorService,
    private readonly lookup: LookupValidationService,
    private readonly notification: NotificationService,
    private readonly scoring: ClientScoringService,
  ) {}

  async create(tenantId: string, actorId: string, dto: CreateBookingDto) {
    await this.relValidation.validateLinkedEntities({
      tenantId,
      clientId: dto.clientId,
      quotationId: dto.quotationId,
      leadId: dto.leadId,
      assignedToId: dto.assignedToId,
      branchId: dto.branchId,
    });

    const bookingRef = dto.bookingRef || (await this.numberGen.generateBookingRef(tenantId));

    if (dto.pnrLocator) {
      const existing = await this.prisma.booking.findFirst({
        where: { tenantId, pnrLocator: dto.pnrLocator, deletedAt: null },
        select: { id: true, bookingRef: true },
      });
      if (existing) {
        throw new BadRequestException(`PNR ${dto.pnrLocator} is already used by booking ${existing.bookingRef}`);
      }
    }

    const booking = await this.prisma.booking.create({
      data: {
        tenantId,
        branchId: dto.branchId ?? null,
        bookingRef,
        pnrLocator: dto.pnrLocator ?? null,
        status: dto.status ?? 'HELD',
        holdExpiresAt: dto.holdExpiresAt ? new Date(dto.holdExpiresAt) : ((dto.status ?? 'HELD') === 'HELD' ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null),
        clientId: dto.clientId ?? null,
        quotationId: dto.quotationId ?? null,
        leadId: dto.leadId ?? null,
        assignedToId: dto.assignedToId ?? null,
        travelStart: dto.travelStart ? new Date(dto.travelStart) : null,
        travelEnd: dto.travelEnd ? new Date(dto.travelEnd) : null,
        notes: dto.notes ?? null,
        createdById: actorId,
      },
    });

    await this.prisma.bookingStatusLog.create({
      data: { tenantId, bookingId: booking.id, toStatus: booking.status, actorId, note: 'Booking created' },
    });

    await this.audit.logMutation(actorId, tenantId, 'BOOKING', 'Booking', booking.id, 'CREATE', { bookingRef });
    await this.activity.logEntityEvent({
      tenantId, userId: actorId, type: 'BOOKING_CREATED',
      subject: `Booking ${bookingRef} created`, entity: 'Booking', entityId: booking.id, branchId: booking.branchId,
    });

    if (dto.assignedToId) {
      const employee = await this.prisma.employee.findFirst({
        where: { tenantId, userId: dto.assignedToId },
        select: { id: true },
      });
      if (employee) {
        await this.prisma.commission.create({
          data: {
            tenantId, employeeId: employee.id,
            sourceType: 'BOOKING', sourceId: booking.id,
            amount: 0, currencyCode: 'USD',
            status: 'PENDING', notes: `Commission for booking ${bookingRef}`,
          },
        }).catch(() => {});
      }
    }

    this.scoring.refreshInBackground(tenantId, booking.clientId);
    return booking;
  }


  async findAll(tenantId: string, query: QueryBookingDto, activeBranchId?: string) {
    const page = query.page ?? 1; const limit = query.limit ?? 50; const skip = (page - 1) * limit;
    const where: any = { tenantId, deletedAt: null };
    if (query.status) where.status = query.status;
    if (query.clientId) where.clientId = query.clientId;
    if (query.assignedToId) where.assignedToId = query.assignedToId;
    if (query.branchId) where.branchId = query.branchId;
    if (query.search) {
      where.OR = [
        { bookingRef: { contains: query.search, mode: 'insensitive' } },
        { pnrLocator: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    enforceBranchScope(where, activeBranchId);
    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit, include: { client: { select: { displayName: true } }, lead: { select: { fullName: true } } } }),
      this.prisma.booking.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(tenantId: string, id: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { passengers: true, segments: true, statusLogs: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async getTimeline(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    return this.activity.findByEntity(tenantId, 'Booking', id);
  }

  async update(tenantId: string, actorId: string, id: string, dto: UpdateBookingDto) {
    const current = await this.prisma.booking.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!current) throw new NotFoundException('Booking not found');

    await this.relValidation.validateLinkedEntities({
      tenantId,
      clientId: dto.clientId,
      quotationId: dto.quotationId,
      leadId: dto.leadId,
      assignedToId: dto.assignedToId,
      branchId: dto.branchId,
    });

    const oldStatus = current.status;

    if (dto.pnrLocator !== undefined && dto.pnrLocator && dto.pnrLocator !== current.pnrLocator) {
      const existing = await this.prisma.booking.findFirst({
        where: { tenantId, pnrLocator: dto.pnrLocator, deletedAt: null, id: { not: id } },
        select: { id: true, bookingRef: true },
      });
      if (existing) {
        throw new BadRequestException(`PNR ${dto.pnrLocator} is already used by booking ${existing.bookingRef}`);
      }
    }

    if (dto.status !== undefined && dto.status !== current.status) {
      const check = validateStatusTransition('booking', current.status, dto.status);
      if (!check.valid) {
        throw new BadRequestException(`Cannot transition from ${current.status} to ${dto.status}. Allowed: ${check.allowed.join(', ') || 'none'}`);
      }
    }

    const booking = await this.prisma.booking.update({
      where: { id },
      data: {
        ...(dto.bookingRef !== undefined && { bookingRef: dto.bookingRef }),
        ...(dto.pnrLocator !== undefined && { pnrLocator: dto.pnrLocator }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.clientId !== undefined && { clientId: dto.clientId }),
        ...(dto.quotationId !== undefined && { quotationId: dto.quotationId }),
        ...(dto.leadId !== undefined && { leadId: dto.leadId }),
        ...(dto.assignedToId !== undefined && { assignedToId: dto.assignedToId }),
        ...(dto.travelStart !== undefined && { travelStart: dto.travelStart ? new Date(dto.travelStart) : null }),
        ...(dto.travelEnd !== undefined && { travelEnd: dto.travelEnd ? new Date(dto.travelEnd) : null }),
        ...(dto.holdExpiresAt !== undefined && { holdExpiresAt: dto.holdExpiresAt ? new Date(dto.holdExpiresAt) : null }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.branchId !== undefined && { branchId: dto.branchId }),
        updatedById: actorId,
      },
    });

    if (dto.status && dto.status !== oldStatus) {
      await this.prisma.bookingStatusLog.create({
        data: { tenantId, bookingId: id, fromStatus: oldStatus, toStatus: dto.status, actorId, note: dto.notes ?? `Status changed from ${oldStatus} to ${dto.status}` },
      });
      await this.activity.logEntityEvent({
        tenantId, userId: actorId, type: 'BOOKING_STATUS_CHANGED',
        subject: `Booking ${booking.bookingRef}: ${oldStatus} -> ${dto.status}`,
        entity: 'Booking', entityId: id, branchId: booking.branchId,
      });
    }

    if (dto.status && dto.status !== oldStatus && (dto.status === 'CONFIRMED' || dto.status === 'TICKETED')) {
      const client = booking.clientId
        ? await this.prisma.client.findFirst({ where: { id: booking.clientId, tenantId }, select: { email: true, displayName: true } })
        : null;
      if (client?.email) {
        this.notification.notify({
          tenantId, userId: actorId, channel: 'EMAIL',
          title: `Booking ${booking.bookingRef} ${dto.status.toLowerCase()}`,
          body: `Dear ${client.displayName},\n\nYour booking ${booking.bookingRef} has been ${dto.status.toLowerCase()}.\n\nTravel dates: ${booking.travelStart ? new Date(booking.travelStart).toLocaleDateString() : 'TBD'} — ${booking.travelEnd ? new Date(booking.travelEnd).toLocaleDateString() : 'TBD'}`,
          userEmail: client.email,
        }).catch(() => {});
      }
    }

    await this.audit.logMutation(actorId, tenantId, 'BOOKING', 'Booking', id, dto.status !== oldStatus ? 'STATUS_CHANGE' : 'UPDATE', { changes: dto });

    this.scoring.refreshInBackground(tenantId, booking.clientId);
    if (current.clientId && current.clientId !== booking.clientId) {
      this.scoring.refreshInBackground(tenantId, current.clientId);
    }

    return booking;
  }

  async addPassenger(tenantId: string, actorId: string, bookingId: string, dto: any) {
    const booking = await this.findById(tenantId, bookingId);

    if (dto.dateOfBirth) {
      const dob = new Date(dto.dateOfBirth);
      const now = new Date();
      if (dob > now) throw new BadRequestException('Date of birth cannot be in the future');
      const age = now.getFullYear() - dob.getFullYear();
      if (age > 150) throw new BadRequestException('Invalid date of birth');
    }

    const passenger = await this.prisma.bookingPassenger.create({
      data: {
        tenantId,
        bookingId,
        passengerType: dto.passengerType ?? 'ADULT',
        title: dto.title,
        firstName: dto.firstName,
        lastName: dto.lastName,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        nationalityId: dto.nationalityId,
        seatPreference: dto.seatPreference,
        mealPreference: dto.mealPreference,
        notes: dto.notes,
      },
    });
    await this.activity.logEntityEvent({
      tenantId, userId: actorId, type: 'BOOKING_PASSENGER_ADDED',
      subject: `Passenger ${dto.firstName} ${dto.lastName} added to booking ${booking.bookingRef}`,
      entity: 'Booking', entityId: bookingId,
    });
    return passenger;
  }

  async addSegment(tenantId: string, actorId: string, bookingId: string, dto: any) {
    const booking = await this.findById(tenantId, bookingId);
    const segment = await this.prisma.bookingSegment.create({
      data: {
        tenantId,
        bookingId,
        segmentType: dto.segmentType ?? 'FLIGHT',
        airlineId: dto.airlineId,
        flightNumber: dto.flightNumber,
        originAirportId: dto.originAirportId,
        destAirportId: dto.destAirportId,
        departureAt: dto.departureAt ? new Date(dto.departureAt) : null,
        arrivalAt: dto.arrivalAt ? new Date(dto.arrivalAt) : null,
        cabinClassId: dto.cabinClassId,
        bookingClass: dto.bookingClass,
        fareBasis: dto.fareBasis,
        baggage: dto.baggage,
        status: dto.status ?? 'CONFIRMED',
        notes: dto.notes,
      },
    });
    await this.activity.logEntityEvent({
      tenantId, userId: actorId, type: 'BOOKING_SEGMENT_ADDED',
      subject: `Segment added to booking ${booking.bookingRef}`,
      entity: 'Booking', entityId: bookingId,
    });
    return segment;
  }

  async createInvoice(tenantId: string, actorId: string, bookingId: string, dto?: any) {
    const booking = await this.findById(tenantId, bookingId);
    const invoiceNumber = await this.numberGen.generateInvoiceNumber(tenantId);

    const invoice = await this.prisma.invoice.create({
      data: {
        tenantId,
        branchId: booking.branchId,
        invoiceNumber,
        clientId: booking.clientId,
        bookingId,
        currencyCode: dto?.currencyCode ?? 'USD',
        totalAmount: dto?.totalAmount ?? 0,
        dueAmount: dto?.totalAmount ?? 0,
        status: 'DRAFT',
        notes: dto?.notes,
        createdById: actorId,
      },
    });

    await this.audit.logMutation(actorId, tenantId, 'INVOICE', 'Invoice', invoice.id, 'CREATE', { invoiceNumber, bookingRef: booking.bookingRef });
    await this.activity.logEntityEvent({
      tenantId, userId: actorId, type: 'INVOICE_CREATED',
      subject: `Invoice ${invoiceNumber} created from booking ${booking.bookingRef}`,
      entity: 'Booking', entityId: bookingId,
    });

    return invoice;
  }

  async remove(tenantId: string, actorId: string, id: string) {
    const booking = await this.findById(tenantId, id);
    await this.prisma.booking.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.logMutation(actorId, tenantId, 'BOOKING', 'Booking', id, 'DELETE', { bookingRef: booking.bookingRef });
    this.scoring.refreshInBackground(tenantId, booking.clientId);
    return { id, deleted: true };
  }

  async getItinerary(tenantId: string, bookingId: string) {
    return this.prisma.tourItineraryDay.findMany({
      where: { tenantId, bookingId },
      orderBy: { dayNumber: 'asc' },
    });
  }

  async addItineraryDay(tenantId: string, bookingId: string, dto: CreateItineraryDayDto) {
    return this.prisma.tourItineraryDay.create({
      data: {
        tenantId, bookingId,
        dayNumber: dto.dayNumber, title: dto.title,
        description: dto.description ?? null,
        activities: dto.activities ?? null,
        hotelName: dto.hotelName ?? null,
        hotelConfirmation: dto.hotelConfirmation ?? null,
        meals: dto.meals ?? null, transfers: dto.transfers ?? null,
        guideName: dto.guideName ?? null, notes: dto.notes ?? null,
      },
    });
  }

  async updateItineraryDay(tenantId: string, dayId: string, dto: UpdateItineraryDayDto) {
    return this.prisma.tourItineraryDay.update({
      where: { id: dayId },
      data: {
        ...(dto.dayNumber !== undefined && { dayNumber: dto.dayNumber }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.activities !== undefined && { activities: dto.activities }),
        ...(dto.hotelName !== undefined && { hotelName: dto.hotelName }),
        ...(dto.hotelConfirmation !== undefined && { hotelConfirmation: dto.hotelConfirmation }),
        ...(dto.meals !== undefined && { meals: dto.meals }),
        ...(dto.transfers !== undefined && { transfers: dto.transfers }),
        ...(dto.guideName !== undefined && { guideName: dto.guideName }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
  }

  async removeItineraryDay(tenantId: string, dayId: string) {
    await this.prisma.tourItineraryDay.delete({ where: { id: dayId } });
    return { id: dayId, deleted: true };
  }
}
