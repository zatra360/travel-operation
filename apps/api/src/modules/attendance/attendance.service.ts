import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { QueryAttendanceDto } from './dto/query-attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async create(tenantId: string, actorId: string, dto: CreateAttendanceDto) {
    const att = await this.prisma.attendance.create({ data: { tenantId, employeeId: dto.employeeId, date: new Date(dto.date), status: dto.status ?? 'PRESENT', clockIn: dto.clockIn ? new Date(dto.clockIn) : null, clockOut: dto.clockOut ? new Date(dto.clockOut) : null, notes: dto.notes ?? null } });
    await this.audit.logMutation(actorId, tenantId, 'ATTENDANCE', 'Attendance', att.id, 'CREATE', { employeeId: att.employeeId, date: att.date.toISOString(), status: att.status });
    return att;
  }

  async findAll(tenantId: string, query: QueryAttendanceDto) {
    const page = query.page ?? 1; const limit = query.limit ?? 50; const skip = (page - 1) * limit;
    const where: any = { tenantId }; if (query.employeeId) where.employeeId = query.employeeId; if (query.status) where.status = query.status; if (query.dateFrom || query.dateTo) { where.date = {}; if (query.dateFrom) where.date.gte = new Date(query.dateFrom); if (query.dateTo) where.date.lte = new Date(query.dateTo); }
    const [data, total] = await Promise.all([this.prisma.attendance.findMany({ where, orderBy: { date: 'desc' }, skip, take: limit, include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } } }), this.prisma.attendance.count({ where })]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(tenantId: string, id: string) { const att = await this.prisma.attendance.findFirst({ where: { id, tenantId } }); if (!att) throw new NotFoundException('Attendance not found'); return att; }

  async update(tenantId: string, actorId: string, id: string, dto: UpdateAttendanceDto) {
    await this.findById(tenantId, id);
    const att = await this.prisma.attendance.update({ where: { id }, data: { ...(dto.status !== undefined && { status: dto.status }), ...(dto.clockIn !== undefined && { clockIn: dto.clockIn ? new Date(dto.clockIn) : null }), ...(dto.clockOut !== undefined && { clockOut: dto.clockOut ? new Date(dto.clockOut) : null }), ...(dto.notes !== undefined && { notes: dto.notes }), ...(dto.employeeId !== undefined && { employeeId: dto.employeeId }), ...(dto.date !== undefined && { date: new Date(dto.date) }) } });
    await this.audit.logMutation(actorId, tenantId, 'ATTENDANCE', 'Attendance', att.id, 'UPDATE', { changes: dto });
    return att;
  }
}
