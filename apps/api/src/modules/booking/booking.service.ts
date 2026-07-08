import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { QueryBookingDto } from './dto/query-booking.dto';
import { validateStatusTransition } from '../../common/utils/status-transitions';

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(tenantId: string, actorId: string, dto: CreateBookingDto) {
    const booking = await this.prisma.booking.create({
      data: {
        tenantId,
        branchId: dto.branchId ?? null,
        bookingRef: dto.bookingRef,
        pnrLocator: dto.pnrLocator ?? null,
        status: dto.status ?? 'PENDING',
        clientId: dto.clientId ?? null,
        quotationId: dto.quotationId ?? null,
        leadId: dto.leadId ?? null,
        assignedToId: dto.assignedToId ?? null,
        travelStart: dto.travelStart ? new Date(dto.travelStart) : null,
        travelEnd: dto.travelEnd ? new Date(dto.travelEnd) : null,
        notes: dto.notes ?? null,
      },
    });

    await this.audit.logMutation(
      actorId,
      tenantId,
      'BOOKING',
      'Booking',
      booking.id,
      'CREATE',
      { bookingRef: booking.bookingRef },
      booking.branchId ?? undefined,
    );

    return booking;
  }

  async findAll(tenantId: string, query: QueryBookingDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

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

    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(tenantId: string, id: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async update(tenantId: string, actorId: string, id: string, dto: UpdateBookingDto) {
    const current = await this.findById(tenantId, id);

    if (dto.status !== undefined && dto.status !== current.status) {
      const check = validateStatusTransition('booking', current.status, dto.status);
      if (!check.valid) throw new BadRequestException(`Cannot transition from ${current.status} to ${dto.status}. Allowed: ${check.allowed.join(', ') || 'none'}`);
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
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.branchId !== undefined && { branchId: dto.branchId }),
      },
    });

    await this.audit.logMutation(
      actorId,
      tenantId,
      'BOOKING',
      'Booking',
      booking.id,
      'UPDATE',
      { changes: dto },
      booking.branchId ?? undefined,
    );

    return booking;
  }

  async remove(tenantId: string, actorId: string, id: string) {
    const booking = await this.findById(tenantId, id);

    await this.prisma.booking.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.audit.logMutation(
      actorId,
      tenantId,
      'BOOKING',
      'Booking',
      booking.id,
      'DELETE',
      { bookingRef: booking.bookingRef },
      booking.branchId ?? undefined,
    );

    return { id, deleted: true };
  }
}
