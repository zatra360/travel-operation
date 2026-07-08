import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { QueryTicketDto } from './dto/query-ticket.dto';

@Injectable()
export class TicketService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(tenantId: string, actorId: string, dto: CreateTicketDto) {
    const ticket = await this.prisma.ticket.create({
      data: {
        tenantId,
        branchId: dto.branchId ?? null,
        bookingId: dto.bookingId,
        ticketNumber: dto.ticketNumber,
        passengerName: dto.passengerName ?? null,
        airlineId: dto.airlineId ?? null,
        status: dto.status ?? 'PENDING',
        issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : null,
        voidedAt: dto.voidAt ? new Date(dto.voidAt) : null,
      },
    });

    await this.audit.logMutation(
      actorId,
      tenantId,
      'TICKET',
      'Ticket',
      ticket.id,
      'CREATE',
      { ticketNumber: ticket.ticketNumber, passengerName: ticket.passengerName },
      ticket.branchId ?? undefined,
    );

    return ticket;
  }

  async findAll(tenantId: string, query: QueryTicketDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

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

    const [data, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(tenantId: string, id: string) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id, tenantId },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async update(tenantId: string, actorId: string, id: string, dto: UpdateTicketDto) {
    await this.findById(tenantId, id);

    const ticket = await this.prisma.ticket.update({
      where: { id },
      data: {
        ...(dto.ticketNumber !== undefined && { ticketNumber: dto.ticketNumber }),
        ...(dto.bookingId !== undefined && { bookingId: dto.bookingId }),
        ...(dto.passengerName !== undefined && { passengerName: dto.passengerName }),
        ...(dto.airlineId !== undefined && { airlineId: dto.airlineId }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.issuedAt !== undefined && { issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : null }),
        ...(dto.voidAt !== undefined && { voidedAt: dto.voidAt ? new Date(dto.voidAt) : null }),
        ...(dto.metadata !== undefined && { metadata: dto.metadata }),
        ...(dto.branchId !== undefined && { branchId: dto.branchId }),
      },
    });

    await this.audit.logMutation(
      actorId,
      tenantId,
      'TICKET',
      'Ticket',
      ticket.id,
      'UPDATE',
      { changes: dto },
      ticket.branchId ?? undefined,
    );

    return ticket;
  }

  async remove(tenantId: string, actorId: string, id: string) {
    const ticket = await this.findById(tenantId, id);

    await this.prisma.ticket.delete({ where: { id } });

    await this.audit.logMutation(
      actorId,
      tenantId,
      'TICKET',
      'Ticket',
      ticket.id,
      'DELETE',
      { ticketNumber: ticket.ticketNumber },
      ticket.branchId ?? undefined,
    );

    return { id, deleted: true };
  }
}
