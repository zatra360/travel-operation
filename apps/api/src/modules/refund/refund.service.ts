import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ActivityService } from '../activity/activity.service';
import { RelationshipValidationService } from '../../common/services/relationship-validation.service';
import { NumberGeneratorService } from '../../common/services/number-generator.service';
import { validateStatusTransition } from '../../common/utils/status-transitions';
import { CreateRefundDto } from './dto/create-refund.dto';
import { UpdateRefundDto } from './dto/update-refund.dto';
import { QueryRefundDto } from './dto/query-refund.dto';

@Injectable()
export class RefundService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly activity: ActivityService,
    private readonly relValidation: RelationshipValidationService,
    private readonly numberGen: NumberGeneratorService,
  ) {}

  async create(tenantId: string, actorId: string, dto: CreateRefundDto) {
    await this.relValidation.validateLinkedEntities({
      tenantId,
      bookingId: dto.bookingId,
      ticketId: dto.ticketId,
      invoiceId: dto.invoiceId,
      clientId: dto.clientId,
      branchId: dto.branchId,
    });

    const refundNumber = await this.numberGen.generateRefundNumber(tenantId);

    const refund = await this.prisma.refundRequest.create({
      data: {
        tenantId,
        branchId: dto.branchId,
        bookingId: dto.bookingId,
        ticketId: dto.ticketId,
        invoiceId: dto.invoiceId,
        clientId: dto.clientId,
        refundNumber,
        requestedAmount: dto.requestedAmount ?? 0,
        reason: dto.reason,
        notes: dto.notes,
        status: 'REQUESTED',
        requestedById: actorId,
        createdById: actorId,
      },
    });

    await this.audit.logMutation(actorId, tenantId, 'REFUND', 'RefundRequest', refund.id, 'CREATE', { refundNumber });
    await this.activity.log(tenantId, actorId, 'REFUND_REQUESTED', `Refund #${refundNumber} requested`, 'RefundRequest', refund.id, dto.branchId);

    return refund;
  }

  async findAll(tenantId: string, query: QueryRefundDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;
    const where: any = { tenantId };
    if (query.status) where.status = query.status;
    if (query.bookingId) where.bookingId = query.bookingId;
    if (query.branchId) where.branchId = query.branchId;
    if (query.search) {
      where.OR = [
        { refundNumber: { contains: query.search, mode: 'insensitive' } },
        { reason: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.refundRequest.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.prisma.refundRequest.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(tenantId: string, id: string) {
    const refund = await this.prisma.refundRequest.findFirst({
      where: { id, tenantId },
      include: {
        booking: true,
        ticket: true,
        invoice: true,
        client: true,
        branch: true,
        requestedBy: { select: { id: true, firstName: true, lastName: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
        processedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!refund) throw new NotFoundException('Refund request not found');
    return refund;
  }

  async update(tenantId: string, actorId: string, id: string, dto: UpdateRefundDto) {
    const refund = await this.findById(tenantId, id);

    if (dto.status && dto.status !== refund.status) {
      const { valid, allowed } = validateStatusTransition('refund', refund.status, dto.status);
      if (!valid) {
        throw new BadRequestException(`Invalid status transition: ${refund.status} -> ${dto.status}. Allowed: ${allowed.join(', ')}`);
      }
    }

    const updated = await this.prisma.refundRequest.update({
      where: { id },
      data: {
        ...(dto.requestedAmount !== undefined && { requestedAmount: dto.requestedAmount }),
        ...(dto.reason !== undefined && { reason: dto.reason }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.branchId !== undefined && { branchId: dto.branchId }),
      },
    });

    await this.audit.logMutation(actorId, tenantId, 'REFUND', 'RefundRequest', id, 'UPDATE', { changes: dto });
    await this.activity.log(tenantId, actorId, 'REFUND_UPDATED', `Refund #${refund.refundNumber} updated`, 'RefundRequest', id, refund.branchId);

    if (dto.status === 'APPROVED' && refund.status !== 'APPROVED') {
      await this.processApproval(tenantId, actorId, updated);
    }

    return updated;
  }

  private async processApproval(tenantId: string, actorId: string, refund: any) {
    const refundNumber = await this.numberGen.generateRefundNumber(tenantId);

    await this.prisma.refundRequest.update({
      where: { id: refund.id },
      data: {
        refundNumber,
        approvedById: actorId,
        approvedAt: new Date(),
      },
    });

    await this.activity.log(tenantId, actorId, 'REFUND_APPROVED', `Refund #${refundNumber} approved`, 'RefundRequest', refund.id, refund.branchId);
  }

  async approve(tenantId: string, actorId: string, id: string) {
    const refund = await this.findById(tenantId, id);

    const { valid, allowed } = validateStatusTransition('refund', refund.status, 'APPROVED');
    if (!valid) {
      throw new BadRequestException(`Invalid status transition: ${refund.status} -> APPROVED. Allowed: ${allowed.join(', ')}`);
    }

    const refundNumber = await this.numberGen.generateRefundNumber(tenantId);

    const updated = await this.prisma.refundRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        refundNumber,
        approvedById: actorId,
        approvedAt: new Date(),
      },
    });

    await this.audit.logMutation(actorId, tenantId, 'REFUND', 'RefundRequest', id, 'APPROVE', { refundNumber });
    await this.activity.log(tenantId, actorId, 'REFUND_APPROVED', `Refund #${refundNumber} approved`, 'RefundRequest', id, refund.branchId);

    return updated;
  }

  async reject(tenantId: string, actorId: string, id: string) {
    const refund = await this.findById(tenantId, id);

    const { valid, allowed } = validateStatusTransition('refund', refund.status, 'REJECTED');
    if (!valid) {
      throw new BadRequestException(`Invalid status transition: ${refund.status} -> REJECTED. Allowed: ${allowed.join(', ')}`);
    }

    const updated = await this.prisma.refundRequest.update({
      where: { id },
      data: { status: 'REJECTED' },
    });

    await this.audit.logMutation(actorId, tenantId, 'REFUND', 'RefundRequest', id, 'REJECT', {});
    await this.activity.log(tenantId, actorId, 'REFUND_REJECTED', `Refund #${refund.refundNumber} rejected`, 'RefundRequest', id, refund.branchId);

    return updated;
  }

  async process(tenantId: string, actorId: string, id: string) {
    const refund = await this.findById(tenantId, id);

    const { valid, allowed } = validateStatusTransition('refund', refund.status, 'PROCESSED');
    if (!valid) {
      throw new BadRequestException(`Invalid status transition: ${refund.status} -> PROCESSED. Allowed: ${allowed.join(', ')}`);
    }

    const updated = await this.prisma.refundRequest.update({
      where: { id },
      data: {
        status: 'PROCESSED',
        processedById: actorId,
        processedAt: new Date(),
      },
    });

    await this.prisma.ledgerEntry.create({
      data: {
        tenantId,
        branchId: refund.branchId,
        referenceType: 'REFUND',
        referenceId: refund.id,
        direction: 'DEBIT',
        currencyCode: 'USD',
        amount: refund.requestedAmount,
        description: `Refund processed: ${refund.refundNumber}`,
        createdById: actorId,
      },
    });

    await this.activity.log(tenantId, actorId, 'LEDGER_ENTRY_CREATED', `Reversal ledger entry for refund ${refund.refundNumber}`, 'LedgerEntry', refund.id, refund.branchId);

    if (refund.ticketId) {
      await this.prisma.ticket.update({
        where: { id: refund.ticketId },
        data: { status: 'REFUNDED' },
      });
      await this.activity.log(tenantId, actorId, 'TICKET_REFUNDED', `Ticket ${refund.ticketId} status updated to REFUNDED`, 'Ticket', refund.ticketId, refund.branchId);
    }

    await this.audit.logMutation(actorId, tenantId, 'REFUND', 'RefundRequest', id, 'PROCESS', { ticketId: refund.ticketId });
    await this.activity.log(tenantId, actorId, 'REFUND_PROCESSED', `Refund #${refund.refundNumber} processed`, 'RefundRequest', id, refund.branchId);

    return updated;
  }

  async getTimeline(tenantId: string, id: string) {
    const refund = await this.findById(tenantId, id);
    return this.activity.findByEntity(tenantId, 'RefundRequest', id);
  }

  async remove(tenantId: string, actorId: string, id: string) {
    const refund = await this.findById(tenantId, id);
    if (refund.status === 'PROCESSED') {
      throw new BadRequestException('Cannot delete a processed refund');
    }
    await this.prisma.refundRequest.delete({ where: { id } });
    await this.audit.logMutation(actorId, tenantId, 'REFUND', 'RefundRequest', id, 'DELETE', { refundNumber: refund.refundNumber });
    return { id, deleted: true };
  }
}
