import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ActivityService } from '../activity/activity.service';
import { RelationshipValidationService } from '../../common/services/relationship-validation.service';
import { NumberGeneratorService } from '../../common/services/number-generator.service';
import { validateStatusTransition } from '../../common/utils/status-transitions';
import { CreateReissueDto } from './dto/create-reissue.dto';
import { UpdateReissueDto } from './dto/update-reissue.dto';
import { QueryReissueDto } from './dto/query-reissue.dto';

@Injectable()
export class ReissueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly activity: ActivityService,
    private readonly relValidation: RelationshipValidationService,
    private readonly numberGen: NumberGeneratorService,
  ) {}

  async create(tenantId: string, actorId: string, dto: CreateReissueDto) {
    await this.relValidation.validateLinkedEntities({
      tenantId,
      bookingId: dto.bookingId,
      clientId: dto.clientId,
      branchId: dto.branchId,
    });

    if (dto.oldTicketId) {
      await this.relValidation.validateLinkedEntities({
        tenantId,
        ticketId: dto.oldTicketId,
      });
    }

    const reissueNumber = await this.numberGen.generateReissueNumber(tenantId);
    const fareDifference = dto.fareDifference ?? 0;
    const serviceCharge = dto.serviceCharge ?? 0;
    const totalCharge = fareDifference + serviceCharge;

    const reissue = await this.prisma.reissueRequest.create({
      data: {
        tenantId,
        branchId: dto.branchId,
        bookingId: dto.bookingId,
        oldTicketId: dto.oldTicketId,
        clientId: dto.clientId,
        reissueNumber,
        fareDifference,
        serviceCharge,
        totalCharge,
        reason: dto.reason,
        notes: dto.notes,
        status: 'REQUESTED',
        requestedById: actorId,
        createdById: actorId,
      },
    });

    await this.audit.logMutation(actorId, tenantId, 'REISSUE', 'ReissueRequest', reissue.id, 'CREATE', { reissueNumber });
    await this.activity.log(tenantId, actorId, 'REISSUE_REQUESTED', `Reissue #${reissueNumber} requested`, 'ReissueRequest', reissue.id, dto.branchId);

    return reissue;
  }

  async findAll(tenantId: string, query: QueryReissueDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;
    const where: any = { tenantId };
    if (query.status) where.status = query.status;
    if (query.bookingId) where.bookingId = query.bookingId;
    if (query.branchId) where.branchId = query.branchId;
    if (query.search) {
      where.OR = [
        { reissueNumber: { contains: query.search, mode: 'insensitive' } },
        { reason: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.reissueRequest.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.prisma.reissueRequest.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(tenantId: string, id: string) {
    const reissue = await this.prisma.reissueRequest.findFirst({
      where: { id, tenantId },
      include: {
        booking: true,
        oldTicket: true,
        newTicket: true,
        client: true,
        requestedBy: { select: { id: true, firstName: true, lastName: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
        processedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!reissue) throw new NotFoundException('Reissue request not found');
    return reissue;
  }

  async update(tenantId: string, actorId: string, id: string, dto: UpdateReissueDto) {
    const reissue = await this.findById(tenantId, id);

    if (dto.status && dto.status !== reissue.status) {
      const { valid, allowed } = validateStatusTransition('reissue', reissue.status, dto.status);
      if (!valid) {
        throw new BadRequestException(`Invalid status transition: ${reissue.status} -> ${dto.status}. Allowed: ${allowed.join(', ')}`);
      }
    }

    const updateData: any = {};
    if (dto.fareDifference !== undefined) updateData.fareDifference = dto.fareDifference;
    if (dto.serviceCharge !== undefined) updateData.serviceCharge = dto.serviceCharge;
    if (dto.fareDifference !== undefined || dto.serviceCharge !== undefined) {
      const fd = dto.fareDifference ?? reissue.fareDifference;
      const sc = dto.serviceCharge ?? reissue.serviceCharge;
      updateData.totalCharge = Number(fd) + Number(sc);
    }
    if (dto.reason !== undefined) updateData.reason = dto.reason;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.branchId !== undefined) updateData.branchId = dto.branchId;
    if (dto.bookingId !== undefined) updateData.bookingId = dto.bookingId;
    if (dto.oldTicketId !== undefined) updateData.oldTicketId = dto.oldTicketId;
    if (dto.clientId !== undefined) updateData.clientId = dto.clientId;

    const updated = await this.prisma.reissueRequest.update({
      where: { id },
      data: updateData,
    });

    await this.audit.logMutation(actorId, tenantId, 'REISSUE', 'ReissueRequest', id, 'UPDATE', { changes: dto });
    await this.activity.log(tenantId, actorId, 'REISSUE_UPDATED', `Reissue #${reissue.reissueNumber} updated`, 'ReissueRequest', id, reissue.branchId);

    if (dto.status && dto.status !== reissue.status) {
      await this.activity.log(tenantId, actorId, 'REISSUE_STATUS_CHANGED', `Reissue #${reissue.reissueNumber} status changed from ${reissue.status} to ${dto.status}`, 'ReissueRequest', id, reissue.branchId);
    }

    return updated;
  }

  async approve(tenantId: string, actorId: string, id: string) {
    const reissue = await this.findById(tenantId, id);

    const { valid, allowed } = validateStatusTransition('reissue', reissue.status, 'APPROVED');
    if (!valid) {
      throw new BadRequestException(`Invalid status transition: ${reissue.status} -> APPROVED. Allowed: ${allowed.join(', ')}`);
    }

    const updated = await this.prisma.reissueRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: actorId,
        approvedAt: new Date(),
      },
    });

    await this.audit.logMutation(actorId, tenantId, 'REISSUE', 'ReissueRequest', id, 'APPROVE', { reissueNumber: reissue.reissueNumber });
    await this.activity.log(tenantId, actorId, 'REISSUE_APPROVED', `Reissue #${reissue.reissueNumber} approved`, 'ReissueRequest', id, reissue.branchId);

    return updated;
  }

  async reject(tenantId: string, actorId: string, id: string) {
    const reissue = await this.findById(tenantId, id);

    const { valid, allowed } = validateStatusTransition('reissue', reissue.status, 'REJECTED');
    if (!valid) {
      throw new BadRequestException(`Invalid status transition: ${reissue.status} -> REJECTED. Allowed: ${allowed.join(', ')}`);
    }

    const updated = await this.prisma.reissueRequest.update({
      where: { id },
      data: { status: 'REJECTED' },
    });

    await this.audit.logMutation(actorId, tenantId, 'REISSUE', 'ReissueRequest', id, 'REJECT', {});
    await this.activity.log(tenantId, actorId, 'REISSUE_REJECTED', `Reissue #${reissue.reissueNumber} rejected`, 'ReissueRequest', id, reissue.branchId);

    return updated;
  }

  async process(tenantId: string, actorId: string, id: string) {
    const reissue = await this.findById(tenantId, id);

    const { valid, allowed } = validateStatusTransition('reissue', reissue.status, 'PROCESSED');
    if (!valid) {
      throw new BadRequestException(`Invalid status transition: ${reissue.status} -> PROCESSED. Allowed: ${allowed.join(', ')}`);
    }

    const updated = await this.prisma.reissueRequest.update({
      where: { id },
      data: {
        status: 'PROCESSED',
        processedById: actorId,
        processedAt: new Date(),
      },
    });

    if (reissue.newTicketId) {
      await this.prisma.ticket.update({
        where: { id: reissue.newTicketId },
        data: { status: 'ISSUED' },
      });
      await this.activity.log(tenantId, actorId, 'TICKET_ISSUED', `New ticket ${reissue.newTicketId} issued for reissue #${reissue.reissueNumber}`, 'Ticket', reissue.newTicketId, reissue.branchId);
    }

    if (reissue.oldTicketId) {
      await this.prisma.ticket.update({
        where: { id: reissue.oldTicketId },
        data: { status: 'REISSUED' },
      });
      await this.activity.log(tenantId, actorId, 'TICKET_REISSUED', `Old ticket ${reissue.oldTicketId} status updated to REISSUED for reissue #${reissue.reissueNumber}`, 'Ticket', reissue.oldTicketId, reissue.branchId);
    }

    await this.audit.logMutation(actorId, tenantId, 'REISSUE', 'ReissueRequest', id, 'PROCESS', { newTicketId: reissue.newTicketId, oldTicketId: reissue.oldTicketId });
    await this.activity.log(tenantId, actorId, 'REISSUE_PROCESSED', `Reissue #${reissue.reissueNumber} processed`, 'ReissueRequest', id, reissue.branchId);

    return updated;
  }

  async getTimeline(tenantId: string, id: string) {
    const reissue = await this.findById(tenantId, id);
    return this.activity.findByEntity(tenantId, 'ReissueRequest', id);
  }

  async remove(tenantId: string, actorId: string, id: string) {
    const reissue = await this.findById(tenantId, id);
    if (reissue.status === 'PROCESSED') {
      throw new BadRequestException('Cannot delete a processed reissue');
    }
    await this.prisma.reissueRequest.delete({ where: { id } });
    await this.audit.logMutation(actorId, tenantId, 'REISSUE', 'ReissueRequest', id, 'DELETE', { reissueNumber: reissue.reissueNumber });
    return { id, deleted: true };
  }
}
