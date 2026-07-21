import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { enforceBranchScope } from '../../common/utils/scope';
import { AuditService } from '../audit/audit.service';
import { ActivityService } from '../activity/activity.service';
import { RelationshipValidationService } from '../../common/services/relationship-validation.service';
import { NumberGeneratorService } from '../../common/services/number-generator.service';
import { validateStatusTransition } from '../../common/utils/status-transitions';
import { LookupValidationService } from '../master-data/lookup-validation.service';
import { ClientScoringService } from '../client/client-scoring.service';
import { CreateCancellationDto } from './dto/create-cancellation.dto';
import { UpdateCancellationDto } from './dto/update-cancellation.dto';
import { QueryCancellationDto } from './dto/query-cancellation.dto';

@Injectable()
export class CancellationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly activity: ActivityService,
    private readonly relValidation: RelationshipValidationService,
    private readonly lookup: LookupValidationService,
    private readonly numberGen: NumberGeneratorService,
    private readonly scoring: ClientScoringService,
  ) {}

  async create(tenantId: string, actorId: string, dto: CreateCancellationDto) {
    await this.relValidation.validateLinkedEntities({
      tenantId,
      bookingId: dto.bookingId,
      ticketId: dto.ticketId,
      clientId: dto.clientId,
      branchId: dto.branchId,
    });
    await this.lookup.validateMultiple(tenantId, [
      { categoryCode: 'cancellation-reason', code: dto.reason },
    ].filter((v) => v.code));

    const cancellationNumber = await this.numberGen.generateCancellationNumber(tenantId);

    const cancellation = await this.prisma.cancellationRequest.create({
      data: {
        tenantId,
        branchId: dto.branchId,
        bookingId: dto.bookingId,
        ticketId: dto.ticketId,
        clientId: dto.clientId,
        cancellationNumber,
        cancellationCharge: dto.cancellationCharge ?? 0,
        refundableAmount: dto.refundableAmount ?? 0,
        reason: dto.reason,
        notes: dto.notes,
        status: 'REQUESTED',
        requestedById: actorId,
        createdById: actorId,
      },
    });

    await this.audit.logMutation(actorId, tenantId, 'CANCELLATION', 'CancellationRequest', cancellation.id, 'CREATE', { cancellationNumber });
    await this.activity.log(tenantId, actorId, 'CANCELLATION_REQUESTED', `Cancellation #${cancellationNumber} requested`, 'CancellationRequest', cancellation.id, dto.branchId);

    this.scoring.refreshInBackground(tenantId, cancellation.clientId);
    return cancellation;
  }

  async findAll(tenantId: string, query: QueryCancellationDto, activeBranchId?: string) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;
    const where: any = { tenantId };
    if (query.status) where.status = query.status;
    if (query.bookingId) where.bookingId = query.bookingId;
    if (query.branchId) where.branchId = query.branchId;
    if (query.search) {
      where.OR = [
        { cancellationNumber: { contains: query.search, mode: 'insensitive' } },
        { reason: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    enforceBranchScope(where, activeBranchId);
    const [data, total] = await Promise.all([
      this.prisma.cancellationRequest.findMany({
        where, orderBy: { createdAt: 'desc' }, skip, take: limit,
        include: { ticket: { select: { ticketNumber: true, passengerName: true } }, booking: { select: { bookingRef: true } }, client: { select: { displayName: true } } },
      }),
      this.prisma.cancellationRequest.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(tenantId: string, id: string) {
    const cancellation = await this.prisma.cancellationRequest.findFirst({
      where: { id, tenantId },
      include: {
        booking: true,
        ticket: true,
        client: true,
        branch: true,
        requestedBy: { select: { id: true, firstName: true, lastName: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
        processedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!cancellation) throw new NotFoundException('Cancellation request not found');
    return cancellation;
  }

  async update(tenantId: string, actorId: string, id: string, dto: UpdateCancellationDto) {
    const cancellation = await this.findById(tenantId, id);

    if (dto.status && dto.status !== cancellation.status) {
      const { valid, allowed } = validateStatusTransition('cancellation', cancellation.status, dto.status);
      if (!valid) {
        throw new BadRequestException(`Invalid status transition: ${cancellation.status} -> ${dto.status}. Allowed: ${allowed.join(', ')}`);
      }
    }

    const updated = await this.prisma.cancellationRequest.update({
      where: { id },
      data: {
        ...(dto.cancellationCharge !== undefined && { cancellationCharge: dto.cancellationCharge }),
        ...(dto.refundableAmount !== undefined && { refundableAmount: dto.refundableAmount }),
        ...(dto.reason !== undefined && { reason: dto.reason }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.branchId !== undefined && { branchId: dto.branchId }),
      },
    });

    await this.audit.logMutation(actorId, tenantId, 'CANCELLATION', 'CancellationRequest', id, 'UPDATE', { changes: dto });
    await this.activity.log(tenantId, actorId, 'CANCELLATION_UPDATED', `Cancellation #${cancellation.cancellationNumber} updated`, 'CancellationRequest', id, cancellation.branchId);

    return updated;
  }

  async approve(tenantId: string, actorId: string, id: string) {
    const cancellation = await this.findById(tenantId, id);

    const { valid, allowed } = validateStatusTransition('cancellation', cancellation.status, 'APPROVED');
    if (!valid) {
      throw new BadRequestException(`Invalid status transition: ${cancellation.status} -> APPROVED. Allowed: ${allowed.join(', ')}`);
    }

    const updated = await this.prisma.cancellationRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: actorId,
        approvedAt: new Date(),
      },
    });

    await this.audit.logMutation(actorId, tenantId, 'CANCELLATION', 'CancellationRequest', id, 'APPROVE', {});
    await this.activity.log(tenantId, actorId, 'CANCELLATION_APPROVED', `Cancellation #${cancellation.cancellationNumber} approved`, 'CancellationRequest', id, cancellation.branchId);

    return updated;
  }

  async reject(tenantId: string, actorId: string, id: string) {
    const cancellation = await this.findById(tenantId, id);

    const { valid, allowed } = validateStatusTransition('cancellation', cancellation.status, 'REJECTED');
    if (!valid) {
      throw new BadRequestException(`Invalid status transition: ${cancellation.status} -> REJECTED. Allowed: ${allowed.join(', ')}`);
    }

    const updated = await this.prisma.cancellationRequest.update({
      where: { id },
      data: { status: 'REJECTED' },
    });

    await this.audit.logMutation(actorId, tenantId, 'CANCELLATION', 'CancellationRequest', id, 'REJECT', {});
    await this.activity.log(tenantId, actorId, 'CANCELLATION_REJECTED', `Cancellation #${cancellation.cancellationNumber} rejected`, 'CancellationRequest', id, cancellation.branchId);

    return updated;
  }

  async process(tenantId: string, actorId: string, id: string) {
    const cancellation = await this.findById(tenantId, id);

    const { valid, allowed } = validateStatusTransition('cancellation', cancellation.status, 'PROCESSED');
    if (!valid) {
      throw new BadRequestException(`Invalid status transition: ${cancellation.status} -> PROCESSED. Allowed: ${allowed.join(', ')}`);
    }

    const postsLedger =
      cancellation.refundableAmount && Number(cancellation.refundableAmount) > 0;
    const currencyCode = (cancellation.booking as any)?.currencyCode ?? 'USD';

    // Status change, reversal posting, booking and ticket updates must be atomic.
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.cancellationRequest.update({
        where: { id },
        data: {
          status: 'PROCESSED',
          processedById: actorId,
          processedAt: new Date(),
        },
      });

      if (postsLedger) {
        await tx.ledgerEntry.create({
          data: {
            tenantId,
            branchId: cancellation.branchId,
            referenceType: 'CANCELLATION',
            referenceId: cancellation.id,
            direction: 'DEBIT',
            currencyCode,
            amount: cancellation.refundableAmount,
            description: `Cancellation reversal: ${cancellation.cancellationNumber}`,
            createdById: actorId,
          },
        });
      }

      if (cancellation.bookingId) {
        await tx.booking.update({
          where: { id: cancellation.bookingId },
          data: { status: 'CANCELLED' },
        });
      }

      if (cancellation.ticketId) {
        await tx.ticket.update({
          where: { id: cancellation.ticketId },
          data: { status: 'VOIDED' },
        });
      }

      return result;
    });

    if (postsLedger) {
      await this.activity.log(tenantId, actorId, 'LEDGER_ENTRY_CREATED', `Reversal ledger entry for cancellation ${cancellation.cancellationNumber}`, 'CancellationRequest', id, cancellation.branchId);
    }
    if (cancellation.bookingId) {
      await this.activity.log(tenantId, actorId, 'BOOKING_CANCELLED', `Booking ${cancellation.bookingId} status updated to CANCELLED`, 'Booking', cancellation.bookingId, cancellation.branchId);
    }
    if (cancellation.ticketId) {
      await this.activity.log(tenantId, actorId, 'TICKET_VOIDED', `Ticket ${cancellation.ticketId} status updated to VOIDED`, 'Ticket', cancellation.ticketId, cancellation.branchId);
    }

    await this.audit.logMutation(actorId, tenantId, 'CANCELLATION', 'CancellationRequest', id, 'PROCESS', {});
    await this.activity.log(tenantId, actorId, 'CANCELLATION_PROCESSED', `Cancellation #${cancellation.cancellationNumber} processed`, 'CancellationRequest', id, cancellation.branchId);

    this.scoring.refreshInBackground(tenantId, cancellation.clientId);
    return updated;
  }

  async getTimeline(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    return this.activity.findByEntity(tenantId, 'CancellationRequest', id);
  }

  async remove(tenantId: string, actorId: string, id: string) {
    const cancellation = await this.findById(tenantId, id);
    if (cancellation.status === 'PROCESSED') {
      throw new BadRequestException('Cannot delete a processed cancellation');
    }
    await this.prisma.cancellationRequest.delete({ where: { id } });
    await this.audit.logMutation(actorId, tenantId, 'CANCELLATION', 'CancellationRequest', id, 'DELETE', { cancellationNumber: cancellation.cancellationNumber });
    this.scoring.refreshInBackground(tenantId, cancellation.clientId);
    return { id, deleted: true };
  }
}
