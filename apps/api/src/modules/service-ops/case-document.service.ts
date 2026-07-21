import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ActivityService } from '../activity/activity.service';

const DOC_TRANSITIONS: Record<string, string[]> = {
  REQUESTED: ['RECEIVED', 'ARCHIVED'],
  RECEIVED: ['UNDER_REVIEW', 'ARCHIVED'],
  UNDER_REVIEW: ['VERIFIED', 'CORRECTION_REQUIRED', 'REJECTED'],
  CORRECTION_REQUIRED: ['RESUBMITTED', 'ARCHIVED'],
  RESUBMITTED: ['UNDER_REVIEW'],
  VERIFIED: ['SUBMITTED', 'EXPIRED', 'ARCHIVED'],
  SUBMITTED: ['EXPIRED', 'ARCHIVED'],
  EXPIRED: ['ARCHIVED'],
  REJECTED: ['ARCHIVED'],
  ARCHIVED: [],
};

const SENSITIVE_CLASSIFICATIONS = ['SENSITIVE', 'MEDICAL'];

@Injectable()
export class CaseDocumentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly activity: ActivityService,
  ) {}

  private async logAccess(tenantId: string, caseDocumentId: string, userId: string, action: string) {
    await this.prisma.documentAccessLog.create({
      data: { tenantId, caseDocumentId, userId, action },
    });
  }

  async request(tenantId: string, actorId: string, dto: {
    serviceCaseItemId: string; documentType: string; title?: string;
    isRequired?: boolean; accessClassification?: string; expiryDate?: string;
  }) {
    const item = await this.prisma.serviceCaseItem.findFirst({
      where: { id: dto.serviceCaseItemId, tenantId, deletedAt: null },
      select: { id: true, serviceCaseId: true, referenceNumber: true, branchId: true },
    });
    if (!item) throw new NotFoundException('Service case item not found');

    const doc = await this.prisma.caseDocument.create({
      data: {
        tenantId,
        serviceCaseId: item.serviceCaseId,
        serviceCaseItemId: item.id,
        documentType: dto.documentType,
        title: dto.title,
        isRequired: dto.isRequired ?? true,
        accessClassification: dto.accessClassification ?? 'STANDARD',
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        requestedById: actorId,
      },
    });
    await this.logAccess(tenantId, doc.id, actorId, 'REQUEST');
    await this.activity.log(tenantId, actorId, 'CASE_DOCUMENT_REQUESTED', `Document ${dto.documentType} requested for ${item.referenceNumber}`, 'ServiceCaseItem', item.id, item.branchId ?? undefined);
    return doc;
  }

  async listForItem(tenantId: string, actorId: string, serviceCaseItemId: string) {
    const docs = await this.prisma.caseDocument.findMany({
      where: { tenantId, serviceCaseItemId },
      orderBy: { createdAt: 'asc' },
    });
    const sensitive = docs.filter((d) => SENSITIVE_CLASSIFICATIONS.includes(d.accessClassification));
    for (const doc of sensitive) {
      await this.logAccess(tenantId, doc.id, actorId, 'VIEW');
    }
    return docs;
  }

  async transition(tenantId: string, actorId: string, id: string, dto: {
    status: string; documentId?: string; rejectionReason?: string; correctionInstructions?: string; expiryDate?: string;
  }) {
    const doc = await this.prisma.caseDocument.findFirst({ where: { id, tenantId } });
    if (!doc) throw new NotFoundException('Case document not found');

    const allowed = DOC_TRANSITIONS[doc.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `DOCUMENT_TRANSITION_INVALID: cannot move document from ${doc.status} to ${dto.status}. Allowed: ${allowed.join(', ') || 'none'}`,
      );
    }
    if (dto.status === 'CORRECTION_REQUIRED' && !dto.correctionInstructions) {
      throw new BadRequestException('Correction instructions are required when requesting a correction');
    }
    if (dto.status === 'REJECTED' && !dto.rejectionReason) {
      throw new BadRequestException('A rejection reason is required');
    }
    if ((dto.status === 'RECEIVED' || dto.status === 'RESUBMITTED') && !dto.documentId && !doc.documentId) {
      throw new BadRequestException('An uploaded document reference (documentId) is required when receiving a document');
    }

    const now = new Date();
    const updated = await this.prisma.caseDocument.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.documentId !== undefined && { documentId: dto.documentId, uploadedById: actorId }),
        ...(dto.status === 'RECEIVED' && { receivedAt: now }),
        ...(dto.status === 'RESUBMITTED' && { receivedAt: now, version: { increment: 1 } }),
        ...(dto.status === 'VERIFIED' && { verifiedAt: now, verifiedById: actorId }),
        ...(dto.rejectionReason !== undefined && { rejectionReason: dto.rejectionReason }),
        ...(dto.correctionInstructions !== undefined && { correctionInstructions: dto.correctionInstructions }),
        ...(dto.expiryDate !== undefined && { expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null }),
      },
    });

    await this.logAccess(tenantId, id, actorId, dto.status);
    await this.audit.logMutation(actorId, tenantId, 'SERVICE_DOCUMENT', 'CaseDocument', id, 'STATUS_CHANGE', {
      documentType: doc.documentType, from: doc.status, to: dto.status,
      reason: dto.rejectionReason ?? dto.correctionInstructions,
    });
    return updated;
  }

  async accessLog(tenantId: string, id: string) {
    const doc = await this.prisma.caseDocument.findFirst({ where: { id, tenantId } });
    if (!doc) throw new NotFoundException('Case document not found');
    return this.prisma.documentAccessLog.findMany({
      where: { caseDocumentId: id },
      orderBy: { createdAt: 'desc' },
    });
  }
}
