import { Test, TestingModule } from '@nestjs/testing';
import { FeedbackService } from './feedback.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

describe('FeedbackService', () => {
  let service: FeedbackService;
  let prisma: any;
  const mockAudit = { logMutation: jest.fn().mockResolvedValue({}) };
  const tenantId = 'tenant-1';
  const actorId = 'user-1';

  beforeEach(async () => {
    prisma = {
      feedback: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
        aggregate: jest.fn(),
        groupBy: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedbackService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<FeedbackService>(FeedbackService);
  });

  describe('create', () => {
    it('creates feedback with rating', async () => {
      prisma.feedback.create.mockResolvedValue({ id: 'fb-1', rating: 5, npsScore: 10 });
      const result = await service.create(tenantId, actorId, { rating: 5, npsScore: 10, comment: 'Great service!' });
      expect(result.rating).toBe(5);
      expect(mockAudit.logMutation).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('calculates NPS score correctly', async () => {
      prisma.feedback.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(6) // promoters (>=9)
        .mockResolvedValueOnce(2); // detractors (<=6)
      prisma.feedback.aggregate.mockResolvedValue({ _avg: { rating: 4.2, npsScore: 8 } });
      prisma.feedback.groupBy.mockResolvedValue([
        { rating: 5, _count: 4 },
        { rating: 4, _count: 3 },
        { rating: 3, _count: 2 },
        { rating: 2, _count: 1 },
      ]);

      const stats = await service.getStats(tenantId);
      expect(stats.total).toBe(10);
      expect(stats.nps).toBe(40); // ((6-2)/10)*100 = 40
      expect(stats.avgRating).toBe(4.2);
    });
  });
});
