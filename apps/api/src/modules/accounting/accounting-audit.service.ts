import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const DB_ERROR_TOKENS = [
  'JOURNAL_NOT_FOUND', 'JOURNAL_ALREADY_POSTED', 'JOURNAL_ALREADY_REVERSED', 'JOURNAL_NOT_APPROVED',
  'JOURNAL_INCOMPLETE', 'JOURNAL_LINE_INVALID', 'JOURNAL_UNBALANCED', 'JOURNAL_ZERO_VALUE',
  'JOURNAL_IMMUTABLE', 'JOURNAL_ITEM_IMMUTABLE', 'JOURNAL_POST_FORBIDDEN',
  'PERIOD_NOT_FOUND', 'PERIOD_CLOSED', 'PERIOD_LOCKED', 'PERIOD_IMMUTABLE',
  'SOD_VIOLATION', 'DUPLICATE_POSTING', 'ACCOUNT_INVALID', 'CONTROL_ACCOUNT_PROTECTED',
  'REVERSAL_REASON_REQUIRED', 'REVERSAL_INVALID_STATE', 'REVERSAL_DUPLICATE',
  'AUDIT_DIRECT_INSERT_FORBIDDEN', 'AUDIT_IMMUTABLE', 'AUDIT_TENANT_REQUIRED', 'AUDIT_ACTION_REQUIRED',
  'DOCNUM_IMMUTABLE', 'DOCNUM_VOID_REASON_REQUIRED',
];

export function mapAccountingDbError(err: unknown): never {
  const message = String((err as Error)?.message ?? '');
  for (const token of DB_ERROR_TOKENS) {
    const idx = message.indexOf(token);
    if (idx >= 0) {
      const detail = message.slice(idx).split('`')[0].split('\n')[0].trim();
      if (token === 'JOURNAL_NOT_FOUND' || token === 'PERIOD_NOT_FOUND') {
        throw new NotFoundException(detail);
      }
      if (token === 'DUPLICATE_POSTING' || token === 'REVERSAL_DUPLICATE' || token === 'JOURNAL_ALREADY_POSTED') {
        throw new ConflictException(detail);
      }
      throw new BadRequestException(detail);
    }
  }
  throw err;
}

export interface AuditEventInput {
  tenantId: string;
  userId?: string | null;
  action: string;
  actionCategory: string;
  tableName?: string | null;
  recordId?: string | null;
  beforeState?: unknown;
  afterState?: unknown;
  reason?: string | null;
  branchId?: string | null;
  requestId?: string | null;
  correlationId?: string | null;
  idempotencyKey?: string | null;
  sourceDocumentType?: string | null;
  sourceDocumentId?: string | null;
  approvalReference?: string | null;
}

@Injectable()
export class AccountingAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async append(event: AuditEventInput): Promise<string> {
    const rows = await this.prisma.$queryRaw<Array<{ fn_append_audit_log: string }>>`
      SELECT fn_append_audit_log(
        ${event.tenantId},
        ${event.userId ?? null},
        ${event.action},
        ${event.actionCategory},
        ${event.tableName ?? null},
        ${event.recordId ?? null},
        ${event.beforeState !== undefined ? JSON.stringify(event.beforeState) : null}::jsonb,
        ${event.afterState !== undefined ? JSON.stringify(event.afterState) : null}::jsonb,
        ${event.reason ?? null},
        ${event.branchId ?? null},
        ${event.requestId ?? null},
        ${event.correlationId ?? null},
        ${event.idempotencyKey ?? null},
        ${event.sourceDocumentType ?? null},
        ${event.sourceDocumentId ?? null},
        ${event.approvalReference ?? null},
        NULL, NULL, NULL
      )`;
    return rows[0].fn_append_audit_log;
  }
}
