import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateFeedbackDto, QueryFeedbackDto } from './dto/feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async create(tenantId: string, actorId: string, dto: CreateFeedbackDto) {
    const feedback = await this.prisma.feedback.create({
      data: {
        tenantId, bookingId: dto.bookingId ?? null, clientId: dto.clientId ?? null,
        rating: dto.rating, npsScore: dto.npsScore ?? null,
        category: dto.category ?? 'GENERAL', comment: dto.comment ?? null,
        isPublic: dto.isPublic ?? false, createdById: actorId,
      },
    });
    await this.audit.logMutation(actorId, tenantId, 'FEEDBACK', 'Feedback', feedback.id, 'CREATE', { rating: feedback.rating });
    return feedback;
  }

  async findAll(tenantId: string, query: QueryFeedbackDto) {
    const page = query.page ?? 1; const limit = query.limit ?? 50; const skip = (page - 1) * limit;
    const where: any = { tenantId };
    if (query.bookingId) where.bookingId = query.bookingId;
    if (query.clientId) where.clientId = query.clientId;
    if (query.category) where.category = query.category;
    const [data, total] = await Promise.all([
      this.prisma.feedback.findMany({
        where, orderBy: { createdAt: 'desc' }, skip, take: limit,
        include: { client: { select: { id: true, displayName: true } }, booking: { select: { id: true, bookingRef: true } } },
      }),
      this.prisma.feedback.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getStats(tenantId: string) {
    const [total, avgRating, npsScores] = await Promise.all([
      this.prisma.feedback.count({ where: { tenantId } }),
      this.prisma.feedback.aggregate({ where: { tenantId }, _avg: { rating: true, npsScore: true } }),
      this.prisma.feedback.groupBy({ by: ['rating'], where: { tenantId }, _count: true, orderBy: { rating: 'asc' } }),
    ]);
    const promoters = await this.prisma.feedback.count({ where: { tenantId, npsScore: { gte: 9 } } });
    const detractors = await this.prisma.feedback.count({ where: { tenantId, npsScore: { lte: 6 } } });
    const nps = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;

    return {
      total, avgRating: Math.round((avgRating._avg.rating ?? 0) * 10) / 10,
      avgNps: Math.round((avgRating._avg.npsScore ?? 0) * 10) / 10,
      nps, promoters, detractors,
      distribution: npsScores.map(s => ({ rating: s.rating, count: s._count })),
    };
  }

  async remove(tenantId: string, actorId: string, id: string) {
    const feedback = await this.prisma.feedback.findFirst({ where: { id, tenantId } });
    if (!feedback) throw new NotFoundException('Feedback not found');
    await this.prisma.feedback.delete({ where: { id } });
    await this.audit.logMutation(actorId, tenantId, 'FEEDBACK', 'Feedback', id, 'DELETE', {});
    return { id, deleted: true };
  }
}
