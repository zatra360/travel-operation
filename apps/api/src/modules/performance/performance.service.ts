import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreatePerformanceDto } from './dto/create-performance.dto';
import { UpdatePerformanceDto } from './dto/update-performance.dto';
import { QueryPerformanceDto } from './dto/query-performance.dto';

@Injectable()
export class PerformanceService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async create(tenantId: string, actorId: string, dto: CreatePerformanceDto) {
    const rev = await this.prisma.performanceReview.create({ data: { tenantId, employeeId: dto.employeeId, reviewerId: dto.reviewerId ?? null, period: dto.period, rating: dto.rating ?? null, strengths: dto.strengths ?? null, improvements: dto.improvements ?? null, notes: dto.notes ?? null, status: dto.status ?? 'DRAFT' } });
    await this.audit.logMutation(actorId, tenantId, 'PERFORMANCE', 'PerformanceReview', rev.id, 'CREATE', { employeeId: rev.employeeId, period: rev.period });
    return rev;
  }

  async findAll(tenantId: string, query: QueryPerformanceDto) {
    const page = query.page ?? 1; const limit = query.limit ?? 50; const skip = (page - 1) * limit;
    const where: any = { tenantId }; if (query.employeeId) where.employeeId = query.employeeId; if (query.status) where.status = query.status;
    const [data, total] = await Promise.all([this.prisma.performanceReview.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit, include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } } }), this.prisma.performanceReview.count({ where })]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(tenantId: string, id: string) { const rev = await this.prisma.performanceReview.findFirst({ where: { id, tenantId } }); if (!rev) throw new NotFoundException('Performance review not found'); return rev; }

  async update(tenantId: string, actorId: string, id: string, dto: UpdatePerformanceDto) {
    await this.findById(tenantId, id);
    const rev = await this.prisma.performanceReview.update({ where: { id }, data: { ...(dto.employeeId !== undefined && { employeeId: dto.employeeId }), ...(dto.reviewerId !== undefined && { reviewerId: dto.reviewerId }), ...(dto.period !== undefined && { period: dto.period }), ...(dto.rating !== undefined && { rating: dto.rating }), ...(dto.strengths !== undefined && { strengths: dto.strengths }), ...(dto.improvements !== undefined && { improvements: dto.improvements }), ...(dto.notes !== undefined && { notes: dto.notes }), ...(dto.status !== undefined && { status: dto.status }) } });
    await this.audit.logMutation(actorId, tenantId, 'PERFORMANCE', 'PerformanceReview', rev.id, 'UPDATE', { changes: dto });
    return rev;
  }

  async remove(tenantId: string, actorId: string, id: string) { const rev = await this.findById(tenantId, id); await this.prisma.performanceReview.delete({ where: { id } }); await this.audit.logMutation(actorId, tenantId, 'PERFORMANCE', 'PerformanceReview', rev.id, 'DELETE', { period: rev.period }); return { id, deleted: true }; }
}
