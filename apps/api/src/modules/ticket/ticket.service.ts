import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { enforceBranchScope } from '../../common/utils/scope';
import { AuditService } from '../audit/audit.service';
import { ActivityService } from '../activity/activity.service';
import { RelationshipValidationService } from '../../common/services/relationship-validation.service';
import { LookupValidationService } from '../master-data/lookup-validation.service';
import { NumberGeneratorService } from '../../common/services/number-generator.service';
import { validateStatusTransition } from '../../common/utils/status-transitions';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { QueryTicketDto } from './dto/query-ticket.dto';

@Injectable()
export class TicketService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly activity: ActivityService,
    private readonly relValidation: RelationshipValidationService,
    private readonly lookup: LookupValidationService,
    private readonly numberGen: NumberGeneratorService,
  ) {}

  async create(tenantId: string, actorId: string, dto: CreateTicketDto) {
    await this.relValidation.validateLinkedEntities({ tenantId, bookingId: dto.bookingId, branchId: dto.branchId });
    await this.lookup.validateMultiple(tenantId, [
      { categoryCode: 'ticket-status', code: dto.status ?? 'PENDING' },
    ].filter((v) => v.code));

    const ticketNumber = dto.ticketNumber || (await this.numberGen.generateTicketNumber(tenantId));

    const ticket = await this.prisma.ticket.create({
      data: {
        tenantId,
        branchId: dto.branchId ?? null,
        bookingId: dto.bookingId,
        ticketNumber,
        passengerName: dto.passengerName ?? null,
        passengerId: dto.passengerId ?? null,
        airlineId: dto.airlineId ?? null,
        status: dto.status ?? 'PENDING',
        issuedAt: dto.status === 'ISSUED' ? new Date() : (dto.issuedAt ? new Date(dto.issuedAt) : null),
        notes: dto.notes ?? null,
        createdById: actorId,
      },
    });

    await this.prisma.ticketStatusLog.create({
      data: { tenantId, ticketId: ticket.id, toStatus: ticket.status, actorId, note: 'Ticket created' },
    });

    await this.prisma.ticketLifecycleEvent.create({
      data: { tenantId, ticketId: ticket.id, action: 'CREATE', category: 'CREATION', ticketCount: ticket.status === 'ISSUED' ? 1 : 0 },
    });

    await this.audit.logMutation(actorId, tenantId, 'TICKET', 'Ticket', ticket.id, 'CREATE', { ticketNumber, passengerName: ticket.passengerName });
    await this.activity.logEntityEvent({ tenantId, userId: actorId, type: 'TICKET_CREATED', subject: `Ticket ${ticketNumber} created`, entity: 'Ticket', entityId: ticket.id, branchId: ticket.branchId });

    if (ticket.status === 'ISSUED') {
      await this.syncBookingStatusToTicketed(tenantId, dto.bookingId, actorId);

      const booking = await this.prisma.booking.findFirst({
        where: { id: dto.bookingId, tenantId },
        select: { assignedToId: true, bookingRef: true },
      });
      if (booking?.assignedToId) {
        const employee = await this.prisma.employee.findFirst({
          where: { tenantId, userId: booking.assignedToId },
          select: { id: true },
        });
        if (employee) {
          await this.prisma.commission.create({
            data: {
              tenantId, employeeId: employee.id,
              sourceType: 'TICKET', sourceId: ticket.id,
              amount: 0, currencyCode: 'USD',
              status: 'PENDING', notes: `Commission for ticket ${ticketNumber}`,
            },
          }).catch(() => {});
        }
      }
    }

    return ticket;
  }

  async findAll(tenantId: string, query: QueryTicketDto, activeBranchId?: string) {
    const page = query.page ?? 1; const limit = query.limit ?? 50; const skip = (page - 1) * limit;
    const where: any = { tenantId };
    if (query.status) where.status = query.status;
    if (query.bookingId) where.bookingId = query.bookingId;
    if (query.branchId) where.branchId = query.branchId;
    if (query.search) {
      where.OR = [
        { ticketNumber: { contains: query.search, mode: 'insensitive' } },
        { passengerName: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    enforceBranchScope(where, activeBranchId);
    const [data, total] = await Promise.all([
      this.prisma.ticket.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit, include: { booking: { select: { bookingRef: true, client: { select: { displayName: true } }, lead: { select: { fullName: true } } } }, airline: { select: { name: true, iataCode: true } } } }),
      this.prisma.ticket.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(tenantId: string, id: string, includeStatusLogs = false) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id, tenantId },
      include: includeStatusLogs ? { statusLogs: { orderBy: { createdAt: 'desc' } } } : undefined,
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async getTimeline(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    return this.activity.findByEntity(tenantId, 'Ticket', id);
  }

  async update(tenantId: string, actorId: string, id: string, dto: UpdateTicketDto) {
    const current = await this.findById(tenantId, id);
    if (dto.bookingId) await this.relValidation.validateLinkedEntities({ tenantId, bookingId: dto.bookingId });

    const oldStatus = current.status;

    if (dto.status && dto.status !== current.status) {
      await this.lookup.validate(tenantId, 'ticket-status', dto.status);
      const check = validateStatusTransition('ticket', current.status, dto.status);
      if (!check.valid) {
        throw new BadRequestException(`Invalid ticket status transition from ${current.status} to ${dto.status}. Allowed: ${check.allowed.join(', ')}`);
      }
    }

    const now = new Date();
    const updateData: any = {
      ...(dto.ticketNumber !== undefined && { ticketNumber: dto.ticketNumber }),
      ...(dto.bookingId !== undefined && { bookingId: dto.bookingId }),
      ...(dto.passengerName !== undefined && { passengerName: dto.passengerName }),
      ...(dto.airlineId !== undefined && { airlineId: dto.airlineId }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
      ...(dto.branchId !== undefined && { branchId: dto.branchId }),
    };

    if (dto.status === 'ISSUED' && oldStatus !== 'ISSUED') {
      updateData.issuedAt = now;
    }
    if (dto.status === 'VOIDED') updateData.voidedAt = now;
    if (dto.status === 'REFUNDED') updateData.refundedAt = now;
    if (dto.status === 'REISSUED') updateData.reissuedAt = now;

    const ticket = await this.prisma.ticket.update({ where: { id }, data: updateData });

    if (dto.status && dto.status !== oldStatus) {
      await this.prisma.ticketStatusLog.create({
        data: { tenantId, ticketId: ticket.id, fromStatus: oldStatus, toStatus: dto.status, actorId, note: dto.notes ?? `Status changed from ${oldStatus} to ${dto.status}` },
      });
      await this.activity.logEntityEvent({
        tenantId, userId: actorId, type: 'TICKET_STATUS_CHANGED',
        subject: `Ticket ${ticket.ticketNumber}: ${oldStatus} -> ${dto.status}`,
        entity: 'Ticket', entityId: id, branchId: ticket.branchId,
      });
    }

    await this.audit.logMutation(actorId, tenantId, 'TICKET', 'Ticket', id, dto.status !== oldStatus ? 'STATUS_CHANGE' : 'UPDATE', { from: oldStatus, to: dto.status ?? oldStatus });

    if (dto.status === 'ISSUED' && oldStatus !== 'ISSUED') {
      await this.syncBookingStatusToTicketed(tenantId, ticket.bookingId, actorId);
    } else if (dto.status === 'VOIDED' || dto.status === 'REFUNDED') {
      await this.syncBookingStatusOnCancellation(tenantId, ticket.bookingId, actorId);
    }

    return ticket;
  }

  private async syncBookingStatusToTicketed(tenantId: string, bookingId: string, actorId: string) {
    const booking = await this.prisma.booking.findFirst({ where: { id: bookingId, tenantId } });
    if (!booking) return;

    const allTickets = await this.prisma.ticket.findMany({ where: { bookingId, tenantId } });
    const allIssued = allTickets.length > 0 && allTickets.every((t) => t.status === 'ISSUED');

    if (allIssued && booking.status !== 'TICKETED') {
      await this.prisma.booking.update({ where: { id: bookingId }, data: { status: 'TICKETED' } });
      await this.prisma.bookingStatusLog.create({ data: { tenantId, bookingId, fromStatus: booking.status, toStatus: 'TICKETED', actorId, note: 'All tickets issued' } });
      await this.activity.logEntityEvent({ tenantId, userId: actorId, type: 'BOOKING_TICKETED', subject: `Booking ${booking.bookingRef} fully ticketed`, entity: 'Booking', entityId: bookingId });
    }
  }

  private async syncBookingStatusOnCancellation(tenantId: string, bookingId: string, _actorId: string) {
    const booking = await this.prisma.booking.findFirst({ where: { id: bookingId, tenantId } });
    if (!booking || booking.status === 'CANCELLED' || booking.status === 'REFUNDED' || booking.status === 'VOIDED') return;

    const allTickets = await this.prisma.ticket.findMany({ where: { bookingId, tenantId } });
    const allVoidOrRefunded = allTickets.every((t) => t.status === 'VOIDED' || t.status === 'REFUNDED');

    if (allVoidOrRefunded) {
      await this.prisma.booking.update({ where: { id: bookingId }, data: { status: allTickets.some((t) => t.status === 'REFUNDED') ? 'REFUNDED' : 'VOIDED' } });
    }
  }

  async issueTicket(tenantId: string, actorId: string, id: string) {
    const ticket = await this.findById(tenantId, id);
    if (ticket.status === 'ISSUED') throw new BadRequestException('Ticket already issued');
    const updated = await this.update(tenantId, actorId, id, { status: 'ISSUED', issuedAt: new Date().toISOString() } as any);
    await this.prisma.ticketLifecycleEvent.create({
      data: { tenantId, ticketId: id, action: 'ISSUE', category: 'ISSUANCE', ticketCount: 1 },
    });
    return updated;
  }

  async voidTicket(tenantId: string, actorId: string, id: string) {
    const ticket = await this.findById(tenantId, id);
    if (ticket.status === 'VOIDED') throw new BadRequestException('Ticket already voided');
    const updated = await this.update(tenantId, actorId, id, { status: 'VOIDED', voidAt: new Date().toISOString() } as any);
    await this.prisma.ticketLifecycleEvent.create({
      data: { tenantId, ticketId: id, action: 'VOID', category: 'CANCELLATION', ticketCount: -1 },
    });
    return updated;
  }

  async refundTicket(tenantId: string, actorId: string, id: string) {
    const ticket = await this.findById(tenantId, id);
    if (ticket.status === 'REFUNDED') throw new BadRequestException('Ticket already refunded');
    const updated = await this.update(tenantId, actorId, id, { status: 'REFUNDED' } as any);
    await this.prisma.ticketLifecycleEvent.create({
      data: { tenantId, ticketId: id, action: 'REFUND', category: 'REFUND', ticketCount: -1 },
    });
    return updated;
  }

  async remove(tenantId: string, actorId: string, id: string) {
    const ticket = await this.findById(tenantId, id);
    await this.prisma.ticket.delete({ where: { id } });
    await this.audit.logMutation(actorId, tenantId, 'TICKET', 'Ticket', id, 'DELETE', { ticketNumber: ticket.ticketNumber });
    return { id, deleted: true };
  }
}
