import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QuotationService } from './quotation.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ActivityService } from '../activity/activity.service';
import { RelationshipValidationService } from '../../common/services/relationship-validation.service';
import { NumberGeneratorService } from '../../common/services/number-generator.service';
import { validateStatusTransition, isTerminalStatus } from '../../common/utils/status-transitions';

describe('QuotationService', () => {
  let service: QuotationService;
  let prisma: any;

  const mockTenant = 'tenant-1';
  const mockActor = 'user-1';
  const mockQuotationId = 'q-1';

  const mockQuotation = (overrides: any = {}) => ({
    id: mockQuotationId, tenantId: mockTenant, quoteNumber: 'QTE-001',
    status: 'DRAFT', title: 'Test', clientId: null, leadId: null,
    assignedToId: null, currencyCode: 'USD', subtotal: 0, taxTotal: 0,
    discountTotal: 0, grandTotal: 0, validUntil: null, notes: null,
    terms: null, branchId: null, currentRevision: 1, publicHash: null,
    signatureRequired: false, clientComment: null, lastViewedAt: null,
    sendStatus: 'NOT_SENT', sentAt: null, viewedAt: null, acceptedAt: null,
    rejectedAt: null, expiredAt: null, cancelledAt: null, bookingCreatedAt: null,
    pnrCreatedAt: null, paymentPendingAt: null, paymentReceivedAt: null,
    ticketIssuedAt: null, completedAt: null, archivedAt: null,
    createdById: mockActor, updatedById: null, createdAt: new Date(),
    updatedAt: new Date(), deletedAt: null, ...overrides,
  });

  const mockLineItem = (overrides: any = {}) => ({
    id: 'li-1', quotationId: mockQuotationId, tenantId: mockTenant,
    title: 'Test item', quantity: 1, unitPrice: 100, taxAmount: 0,
    discountAmount: 0, lineTotal: 100, serviceType: null, description: null,
    airlineId: null, originAirportId: null, destAirportId: null, routeId: null,
    sortOrder: 0, metadata: {}, createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(async () => {
    const mockAudit = { logMutation: jest.fn() };
    const mockActivity = { logEntityEvent: jest.fn(), findByEntity: jest.fn() };
    const mockRelValidation = { validateLinkedEntities: jest.fn() };
    const mockNumberGen = {
      generateQuoteNumber: jest.fn().mockResolvedValue('QTE-001'),
      generateBookingRef: jest.fn().mockResolvedValue('BKG-001'),
      generateInvoiceNumber: jest.fn().mockResolvedValue('INV-001'),
    };

    prisma = {
      quotation: {
        findFirst: jest.fn().mockResolvedValue(mockQuotation()),
        findUnique: jest.fn().mockResolvedValue(mockQuotation()),
        update: jest.fn().mockResolvedValue(mockQuotation()),
        create: jest.fn().mockResolvedValue(mockQuotation()),
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
      quotationLineItem: {
        create: jest.fn().mockResolvedValue(mockLineItem()),
        update: jest.fn().mockResolvedValue(mockLineItem({ title: 'Updated', quantity: 2, lineTotal: 210 })),
        delete: jest.fn().mockResolvedValue(mockLineItem()),
        findFirst: jest.fn().mockResolvedValue(mockLineItem()),
        findMany: jest.fn().mockResolvedValue([mockLineItem({ quantity: 1, unitPrice: 100 })]),
      },
      quotationStatusLog: { create: jest.fn() },
      quotationRevision: { create: jest.fn() },
      quotationSign: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn() },
      client: { findFirstOrThrow: jest.fn().mockResolvedValue({ id: 'client-1' }) },
      lead: { update: jest.fn() },
      invoice: { create: jest.fn().mockResolvedValue({ id: 'inv-1' }) },
      invoiceLine: { create: jest.fn() },
      booking: { create: jest.fn().mockResolvedValue({ id: 'bkg-1' }) },
      bookingStatusLog: { create: jest.fn() },
      $transaction: jest.fn((cb: any) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotationService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: mockAudit },
        { provide: ActivityService, useValue: mockActivity },
        { provide: RelationshipValidationService, useValue: mockRelValidation },
        { provide: NumberGeneratorService, useValue: mockNumberGen },
      ],
    }).compile();

    service = module.get<QuotationService>(QuotationService);
  });

  describe('Line Items', () => {
    describe('addLineItem', () => {
      it('creates a line item successfully', async () => {
        const result = await service.addLineItem(mockTenant, mockActor, mockQuotationId, { title: 'Round-trip airfare' });
        expect(result).toBeDefined();
        expect(result.id).toBe('li-1');
        expect(prisma.quotationLineItem.create).toHaveBeenCalled();
      });

      it('blocks adding to an accepted quotation', async () => {
        prisma.quotation.findFirst.mockResolvedValueOnce(mockQuotation({ status: 'ACCEPTED' }));
        await expect(service.addLineItem(mockTenant, mockActor, mockQuotationId, { title: 'Test' })).rejects.toThrow(BadRequestException);
      });

      it('blocks adding to a cancelled quotation', async () => {
        prisma.quotation.findFirst.mockResolvedValueOnce(mockQuotation({ status: 'CANCELLED' }));
        await expect(service.addLineItem(mockTenant, mockActor, mockQuotationId, { title: 'Test' })).rejects.toThrow(BadRequestException);
      });

      it('blocks adding to a booking_created quotation', async () => {
        prisma.quotation.findFirst.mockResolvedValueOnce(mockQuotation({ status: 'BOOKING_CREATED' }));
        await expect(service.addLineItem(mockTenant, mockActor, mockQuotationId, { title: 'Test' })).rejects.toThrow(BadRequestException);
      });

      it('computes lineTotal from quantity and unitPrice', async () => {
        await service.addLineItem(mockTenant, mockActor, mockQuotationId, {
          title: 'Test', quantity: 3, unitPrice: 200, taxAmount: 30, discountAmount: 10,
        });
        expect(prisma.quotationLineItem.create).toHaveBeenCalledWith(
          expect.objectContaining({ data: expect.objectContaining({ lineTotal: 620 }) }),
        );
      });
    });

    describe('updateLineItem', () => {
      it('updates a line item', async () => {
        const result = await service.updateLineItem(mockTenant, mockActor, mockQuotationId, 'li-1', { quantity: 3 });
        expect(result).toBeDefined();
        expect(prisma.quotationLineItem.update).toHaveBeenCalled();
      });

      it('throws NotFoundException for non-existent line item', async () => {
        prisma.quotationLineItem.findFirst.mockResolvedValueOnce(null);
        await expect(service.updateLineItem(mockTenant, mockActor, mockQuotationId, 'bad-id', { quantity: 1 })).rejects.toThrow(NotFoundException);
      });

      it('blocks updating on a locked quotation', async () => {
        prisma.quotation.findFirst.mockResolvedValueOnce(mockQuotation({ status: 'BOOKING_CREATED' }));
        await expect(service.updateLineItem(mockTenant, mockActor, mockQuotationId, 'li-1', { quantity: 1 })).rejects.toThrow(BadRequestException);
      });
    });

    describe('removeLineItem', () => {
      it('removes a line item', async () => {
        const result = await service.removeLineItem(mockTenant, mockActor, mockQuotationId, 'li-1');
        expect(result).toEqual({ id: 'li-1', deleted: true });
        expect(prisma.quotationLineItem.delete).toHaveBeenCalled();
      });

      it('blocks removing from accepted quotation', async () => {
        prisma.quotation.findFirst.mockResolvedValueOnce(mockQuotation({ status: 'ACCEPTED' }));
        await expect(service.removeLineItem(mockTenant, mockActor, mockQuotationId, 'li-1')).rejects.toThrow(BadRequestException);
      });

      it('blocks removing non-existent line item', async () => {
        prisma.quotationLineItem.findFirst.mockResolvedValueOnce(null);
        await expect(service.removeLineItem(mockTenant, mockActor, mockQuotationId, 'bad-li')).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe('Totals', () => {
    it('recalculates totals after adding a line item', async () => {
      prisma.quotationLineItem.findMany.mockResolvedValueOnce([
        mockLineItem({ quantity: 2, unitPrice: 100, taxAmount: 5, discountAmount: 0 }),
      ]);
      await service.addLineItem(mockTenant, mockActor, mockQuotationId, { title: 'Test' });
      const updateCall = prisma.quotation.update.mock.calls[0][0];
      expect(updateCall.data.subtotal).toBe(200);
      expect(updateCall.data.taxTotal).toBe(5);
      expect(updateCall.data.discountTotal).toBe(0);
      expect(updateCall.data.grandTotal).toBe(205);
    });

    it('calculates grand total = subtotal + tax - discount', async () => {
      prisma.quotationLineItem.findMany.mockResolvedValueOnce([
        mockLineItem({ quantity: 2, unitPrice: 100, taxAmount: 10, discountAmount: 5 }),
      ]);
      await service.addLineItem(mockTenant, mockActor, mockQuotationId, { title: 'Test' });
      const updateCall = prisma.quotation.update.mock.calls[0][0];
      expect(updateCall.data.subtotal).toBe(200);
      expect(updateCall.data.grandTotal).toBe(205);
    });

    it('handles multiple line items correctly', async () => {
      prisma.quotationLineItem.findMany.mockResolvedValueOnce([
        mockLineItem({ quantity: 1, unitPrice: 100, taxAmount: 5, discountAmount: 0 }),
        mockLineItem({ quantity: 2, unitPrice: 50, taxAmount: 3, discountAmount: 2 }),
      ]);
      await service.addLineItem(mockTenant, mockActor, mockQuotationId, { title: 'Test' });
      const updateCall = prisma.quotation.update.mock.calls[0][0];
      expect(updateCall.data.subtotal).toBe(200);
      expect(updateCall.data.taxTotal).toBe(8);
      expect(updateCall.data.discountTotal).toBe(2);
      expect(updateCall.data.grandTotal).toBe(206);
    });

    it('maintains decimal precision', async () => {
      prisma.quotationLineItem.findMany.mockResolvedValueOnce([
        mockLineItem({ quantity: 3, unitPrice: 33.33, taxAmount: 2.5, discountAmount: 1.25 }),
      ]);
      await service.addLineItem(mockTenant, mockActor, mockQuotationId, { title: 'Test' });
      const updateCall = prisma.quotation.update.mock.calls[0][0];
      expect(updateCall.data.subtotal).toBeCloseTo(99.99, 2);
      expect(updateCall.data.grandTotal).toBeCloseTo(101.24, 2);
    });
  });

  describe('Status Transitions', () => {
    it('allows DRAFT to SENT', () => {
      expect(validateStatusTransition('quotation', 'DRAFT', 'SENT').valid).toBe(true);
    });

    it('allows SENT to ACCEPTED', () => {
      expect(validateStatusTransition('quotation', 'SENT', 'ACCEPTED').valid).toBe(true);
    });

    it('rejects SENT to BOOKING_CREATED', () => {
      expect(validateStatusTransition('quotation', 'SENT', 'BOOKING_CREATED').valid).toBe(false);
    });

    it('allows REJECTED back to DRAFT', () => {
      expect(validateStatusTransition('quotation', 'REJECTED', 'DRAFT').valid).toBe(true);
    });

    it('marks terminal statuses correctly', () => {
      expect(isTerminalStatus('quotation', 'BOOKING_CREATED')).toBe(true);
      expect(isTerminalStatus('quotation', 'CANCELLED')).toBe(true);
      expect(isTerminalStatus('quotation', 'DRAFT')).toBe(false);
    });

    it('allows SENT to VIEWED', () => {
      expect(validateStatusTransition('quotation', 'SENT', 'VIEWED').valid).toBe(true);
    });
  });
});
