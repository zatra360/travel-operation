import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LookupValidationService } from '../master-data/lookup-validation.service';
import { validateStatusTransition } from '../../common/utils/status-transitions';
import { NotificationService } from '../notification/notification.service';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { UpdateLeaveDto } from './dto/update-leave.dto';
import { QueryLeaveDto } from './dto/query-leave.dto';

@Injectable()
export class LeaveService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, private readonly lookup: LookupValidationService, private readonly notification: NotificationService) {}

  async create(tenantId: string, actorId: string, dto: CreateLeaveDto) {
    await this.lookup.validateMultiple(tenantId, [
      { categoryCode: 'leave-type', code: dto.leaveType },
    ].filter((v) => v.code));
    const leave = await this.prisma.leave.create({ data: { tenantId, employeeId: dto.employeeId, leaveType: dto.leaveType, startDate: new Date(dto.startDate), endDate: new Date(dto.endDate), status: dto.status ?? 'PENDING', reason: dto.reason ?? null } });
    await this.audit.logMutation(actorId, tenantId, 'LEAVE', 'Leave', leave.id, 'CREATE', { leaveType: leave.leaveType, status: leave.status });
    return leave;
  }

  async findAll(tenantId: string, query: QueryLeaveDto) {
    const page = query.page ?? 1; const limit = query.limit ?? 50; const skip = (page - 1) * limit;
    const where: any = { tenantId }; if (query.employeeId) where.employeeId = query.employeeId; if (query.status) where.status = query.status;
    const [data, total] = await Promise.all([this.prisma.leave.findMany({ where, orderBy: { startDate: 'desc' }, skip, take: limit, include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } } }), this.prisma.leave.count({ where })]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(tenantId: string, id: string) { const leave = await this.prisma.leave.findFirst({ where: { id, tenantId } }); if (!leave) throw new NotFoundException('Leave request not found'); return leave; }

  async update(tenantId: string, actorId: string, id: string, dto: UpdateLeaveDto) {
    const current = await this.findById(tenantId, id);
    await this.lookup.validateMultiple(tenantId, [
      { categoryCode: 'leave-type', code: dto.leaveType },
    ].filter((v) => v.code));
    if (dto.status !== undefined && dto.status !== current.status) {
      const check = validateStatusTransition('leave', current.status, dto.status);
      if (!check.valid) {
        throw new BadRequestException(`Cannot transition from ${current.status} to ${dto.status}. Allowed: ${check.allowed.join(', ') || 'none'}`);
      }
    }
    const leave = await this.prisma.leave.update({ where: { id }, data: { ...(dto.leaveType !== undefined && { leaveType: dto.leaveType }), ...(dto.status !== undefined && { status: dto.status }), ...(dto.reason !== undefined && { reason: dto.reason }), ...(dto.startDate !== undefined && { startDate: new Date(dto.startDate) }), ...(dto.endDate !== undefined && { endDate: new Date(dto.endDate) }), ...(dto.employeeId !== undefined && { employeeId: dto.employeeId }) } });
    await this.audit.logMutation(actorId, tenantId, 'LEAVE', 'Leave', leave.id, 'UPDATE', { changes: dto });
    if (dto.status === 'APPROVED' || dto.status === 'REJECTED') {
      this.notification.notify({
        tenantId, userId: actorId,
        title: `Leave request ${dto.status.toLowerCase()}`,
        body: `Your leave request (${leave.leaveType}) has been ${dto.status.toLowerCase()}.`,
      }).catch(() => {});
    }
    return leave;
  }
}
