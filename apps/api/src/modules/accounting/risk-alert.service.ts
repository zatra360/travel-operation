import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountingAuditService } from './accounting-audit.service';
import { ReconciliationService } from './reconciliation.service';

const ALERT_STATUSES = ['OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED'] as const;

interface AlertCandidate {
  alertType: string;
  severity: string;
  entityType?: string;
  entityId?: string;
  dedupeKey: string;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Fraud / anomaly detection over the operational and accounting data.
 * Alerts never imply guilt: they open an auditable human review workflow
 * (OPEN -> IN_REVIEW -> RESOLVED | DISMISSED), and every review action is
 * recorded in the immutable audit ledger.
 */
@Injectable()
export class RiskAlertService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AccountingAuditService,
    private readonly reconciliation: ReconciliationService,
  ) {}

  // Note: duplicate invoice numbers are structurally impossible here —
  // the Invoice table enforces UNIQUE (tenantId, invoiceNumber). The real
  // residual risks are double-billing (same client/amount/day under
  // different numbers) and reused payment references.
  private async detectSimilarInvoices(tenantId: string): Promise<AlertCandidate[]> {
    const rows = await this.prisma.$queryRaw<Array<{ clientId: string; totalAmount: unknown; day: Date; count: bigint }>>`
      SELECT "clientId", "totalAmount", date_trunc('day', COALESCE("issuedAt", "createdAt")) AS day, COUNT(*) AS count
        FROM "Invoice"
       WHERE "tenantId" = ${tenantId} AND "deletedAt" IS NULL
         AND "clientId" IS NOT NULL AND "totalAmount" > 0
         AND "status" <> 'CANCELLED'
       GROUP BY "clientId", "totalAmount", date_trunc('day', COALESCE("issuedAt", "createdAt"))
      HAVING COUNT(*) > 1`;
    return rows.map((r) => ({
      alertType: 'SIMILAR_INVOICES',
      severity: 'HIGH',
      entityType: 'Invoice',
      dedupeKey: `DUP_INV:${r.clientId}:${Number(r.totalAmount)}:${r.day?.toISOString?.().slice(0, 10)}`,
      title: `${Number(r.count)} invoices of ${Number(r.totalAmount)} for the same client on the same day`,
      description: 'Possible double billing under different invoice numbers.',
      metadata: { clientId: r.clientId, totalAmount: Number(r.totalAmount), count: Number(r.count) },
    }));
  }

  private async detectDuplicatePaymentReferences(tenantId: string): Promise<AlertCandidate[]> {
    const rows = await this.prisma.$queryRaw<Array<{ reference: string; count: bigint }>>`
      SELECT "reference", COUNT(*) AS count
        FROM "Payment"
       WHERE "tenantId" = ${tenantId} AND "reference" IS NOT NULL AND "reference" <> ''
       GROUP BY "reference"
      HAVING COUNT(*) > 1`;
    return rows.map((r) => ({
      alertType: 'DUPLICATE_PAYMENT_REFERENCE',
      severity: 'HIGH',
      entityType: 'Payment',
      dedupeKey: `DUP_PAYREF:${r.reference}`,
      title: `Payment reference "${r.reference}" is used on ${Number(r.count)} payments`,
      description: 'The same external reference appears on multiple payments.',
      metadata: { reference: r.reference, count: Number(r.count) },
    }));
  }

  private async detectDuplicateExpenses(tenantId: string): Promise<AlertCandidate[]> {
    const rows = await this.prisma.$queryRaw<Array<{ vendorName: string; amount: unknown; day: Date; count: bigint }>>`
      SELECT "vendorName", "amount", date_trunc('day', "expenseDate") AS day, COUNT(*) AS count
        FROM "Expense"
       WHERE "tenantId" = ${tenantId} AND "deletedAt" IS NULL
         AND "vendorName" IS NOT NULL AND "amount" > 0 AND "expenseDate" IS NOT NULL
       GROUP BY "vendorName", "amount", date_trunc('day', "expenseDate")
      HAVING COUNT(*) > 1`;
    return rows.map((r) => ({
      alertType: 'DUPLICATE_EXPENSE',
      severity: 'HIGH',
      entityType: 'Expense',
      dedupeKey: `DUP_EXP:${r.vendorName}:${Number(r.amount)}:${r.day?.toISOString?.().slice(0, 10)}`,
      title: `${Number(r.count)} expenses of ${Number(r.amount)} to "${r.vendorName}" on the same day`,
      description: 'Possible duplicate expense submission.',
      metadata: { vendorName: r.vendorName, amount: Number(r.amount), count: Number(r.count) },
    }));
  }

  private async detectRoundNumberManualJournals(tenantId: string): Promise<AlertCandidate[]> {
    const rows = await this.prisma.$queryRaw<Array<{ id: string; journalNumber: string | null; total: unknown }>>`
      SELECT je."id", je."journalNumber", SUM(ji."functionalDebit") AS total
        FROM "JournalEntry" je
        JOIN "JournalItem" ji ON ji."journalEntryId" = je."id"
       WHERE je."tenantId" = ${tenantId}
         AND je."status" IN ('POSTED', 'REVERSED')
         AND je."journalType" IN ('MANUAL', 'GENERAL')
       GROUP BY je."id", je."journalNumber"
      HAVING SUM(ji."functionalDebit") >= 1000 AND SUM(ji."functionalDebit") % 100 = 0`;
    return rows.map((r) => ({
      alertType: 'ROUND_NUMBER_MANUAL_JOURNAL',
      severity: 'MEDIUM',
      entityType: 'JournalEntry',
      entityId: r.id,
      dedupeKey: `ROUND_MANUAL:${r.id}`,
      title: `Manual journal ${r.journalNumber ?? r.id} posts a round amount of ${Number(r.total)}`,
      description: 'Large round-number manual journals warrant supporting evidence.',
      metadata: { journalNumber: r.journalNumber, total: Number(r.total) },
    }));
  }

  private async detectUnusualHourPostings(tenantId: string): Promise<AlertCandidate[]> {
    const rows = await this.prisma.$queryRaw<Array<{ id: string; journalNumber: string | null; postedAt: Date }>>`
      SELECT "id", "journalNumber", "postedAt"
        FROM "JournalEntry"
       WHERE "tenantId" = ${tenantId}
         AND "status" IN ('POSTED', 'REVERSED')
         AND "journalType" IN ('MANUAL', 'GENERAL')
         AND EXTRACT(HOUR FROM "postedAt") NOT BETWEEN 6 AND 22`;
    return rows.map((r) => ({
      alertType: 'UNUSUAL_HOUR_POSTING',
      severity: 'LOW',
      entityType: 'JournalEntry',
      entityId: r.id,
      dedupeKey: `UNUSUAL_HOUR:${r.id}`,
      title: `Manual journal ${r.journalNumber ?? r.id} posted at an unusual hour`,
      description: 'Posting occurred outside 06:00-22:59 (server time).',
      metadata: { journalNumber: r.journalNumber, postedAt: r.postedAt },
    }));
  }

  private async detectBackdatedPostings(tenantId: string): Promise<AlertCandidate[]> {
    const rows = await this.prisma.$queryRaw<Array<{ id: string; journalNumber: string | null; entryDate: Date; postedAt: Date }>>`
      SELECT "id", "journalNumber", "entryDate", "postedAt"
        FROM "JournalEntry"
       WHERE "tenantId" = ${tenantId}
         AND "status" IN ('POSTED', 'REVERSED')
         AND "postedAt" - "entryDate" > INTERVAL '30 days'`;
    return rows.map((r) => ({
      alertType: 'BACKDATED_POSTING',
      severity: 'MEDIUM',
      entityType: 'JournalEntry',
      entityId: r.id,
      dedupeKey: `BACKDATED:${r.id}`,
      title: `Journal ${r.journalNumber ?? r.id} was posted more than 30 days after its accounting date`,
      metadata: { journalNumber: r.journalNumber, entryDate: r.entryDate, postedAt: r.postedAt },
    }));
  }

  private async detectRapidManualPostings(tenantId: string): Promise<AlertCandidate[]> {
    const rows = await this.prisma.$queryRaw<Array<{ id: string; journalNumber: string | null; total: unknown }>>`
      SELECT je."id", je."journalNumber", SUM(ji."functionalDebit") AS total
        FROM "JournalEntry" je
        JOIN "JournalItem" ji ON ji."journalEntryId" = je."id"
       WHERE je."tenantId" = ${tenantId}
         AND je."status" IN ('POSTED', 'REVERSED')
         AND je."journalType" IN ('MANUAL', 'GENERAL')
         AND je."postedAt" - je."createdAt" < INTERVAL '2 minutes'
       GROUP BY je."id", je."journalNumber"
      HAVING SUM(ji."functionalDebit") >= 1000`;
    return rows.map((r) => ({
      alertType: 'RAPID_CREATE_POST',
      severity: 'HIGH',
      entityType: 'JournalEntry',
      entityId: r.id,
      dedupeKey: `RAPID:${r.id}`,
      title: `Manual journal ${r.journalNumber ?? r.id} for ${Number(r.total)} was created and posted within 2 minutes`,
      description: 'Rapid create-post patterns on large manual journals deserve review.',
      metadata: { journalNumber: r.journalNumber, total: Number(r.total) },
    }));
  }

  private async detectUnpostedFinancialDocuments(tenantId: string): Promise<AlertCandidate[]> {
    const glActive = (await this.prisma.gLAccount.count({ where: { tenantId } })) > 0;
    if (!glActive) return [];
    const unposted = await this.reconciliation.findUnpostedDocuments(tenantId);
    return unposted
      .filter((d) => d.documentType === 'Payment')
      .map((d) => ({
        alertType: 'PAYMENT_WITHOUT_JOURNAL',
        severity: 'HIGH',
        entityType: 'Payment',
        entityId: d.id,
        dedupeKey: `UNPOSTED_PAYMENT:${d.id}`,
        title: `Received payment ${d.number ?? d.id} of ${d.amount} has no posted journal entry`,
        description: 'Money was received without a corresponding ledger posting.',
        metadata: { amount: d.amount, status: d.status },
      }));
  }

  async scan(tenantId: string, actorId: string) {
    const detectors = await Promise.all([
      this.detectSimilarInvoices(tenantId),
      this.detectDuplicatePaymentReferences(tenantId),
      this.detectDuplicateExpenses(tenantId),
      this.detectRoundNumberManualJournals(tenantId),
      this.detectUnusualHourPostings(tenantId),
      this.detectBackdatedPostings(tenantId),
      this.detectRapidManualPostings(tenantId),
      this.detectUnpostedFinancialDocuments(tenantId),
    ]);
    const candidates = detectors.flat();

    const result = candidates.length
      ? await this.prisma.financialRiskAlert.createMany({
          data: candidates.map((c) => ({
            tenantId,
            alertType: c.alertType,
            severity: c.severity,
            entityType: c.entityType,
            entityId: c.entityId,
            dedupeKey: c.dedupeKey,
            title: c.title,
            description: c.description,
            metadata: (c.metadata ?? {}) as any,
          })),
          skipDuplicates: true,
        })
      : { count: 0 };

    if (result.count > 0) {
      await this.audit.append({
        tenantId, userId: actorId, action: 'RISK_SCAN_COMPLETED', actionCategory: 'COMPLIANCE',
        tableName: 'FinancialRiskAlert',
        afterState: { candidates: candidates.length, newAlerts: result.count },
      });
    }

    return { candidates: candidates.length, newAlerts: result.count };
  }

  async findAll(tenantId: string, query: { page?: number; limit?: number; status?: string; alertType?: string; severity?: string }) {
    const page = Number(query.page ?? 1);
    const limit = Math.min(Number(query.limit ?? 50), 200);
    const skip = (page - 1) * limit;
    const where: any = { tenantId };
    if (query.status) where.status = query.status;
    if (query.alertType) where.alertType = query.alertType;
    if (query.severity) where.severity = query.severity;

    const [data, total] = await Promise.all([
      this.prisma.financialRiskAlert.findMany({ where, orderBy: [{ status: 'asc' }, { detectedAt: 'desc' }], skip, take: limit }),
      this.prisma.financialRiskAlert.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async review(tenantId: string, actorId: string, id: string, dto: { status: string; note?: string }) {
    if (!ALERT_STATUSES.includes(dto.status as any) || dto.status === 'OPEN') {
      throw new BadRequestException(`Review status must be one of IN_REVIEW, RESOLVED, DISMISSED`);
    }
    const alert = await this.prisma.financialRiskAlert.findFirst({ where: { id, tenantId } });
    if (!alert) throw new NotFoundException('Risk alert not found');
    if (alert.status === 'RESOLVED' || alert.status === 'DISMISSED') {
      throw new BadRequestException(`Alert is already ${alert.status} and cannot be re-reviewed`);
    }
    if ((dto.status === 'RESOLVED' || dto.status === 'DISMISSED') && !dto.note) {
      throw new BadRequestException('Resolving or dismissing an alert requires a note');
    }

    const updated = await this.prisma.financialRiskAlert.update({
      where: { id },
      data: {
        status: dto.status,
        reviewedById: actorId,
        reviewedAt: new Date(),
        ...(dto.note !== undefined && { resolutionNote: dto.note }),
      },
    });

    await this.audit.append({
      tenantId, userId: actorId, action: 'RISK_ALERT_REVIEWED', actionCategory: 'COMPLIANCE',
      tableName: 'FinancialRiskAlert', recordId: id,
      beforeState: { status: alert.status },
      afterState: { status: dto.status, alertType: alert.alertType },
      reason: dto.note,
    });

    return updated;
  }
}
