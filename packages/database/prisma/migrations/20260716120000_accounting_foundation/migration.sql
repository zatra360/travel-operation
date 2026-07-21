-- CreateEnum
CREATE TYPE "FiscalYearStatus" AS ENUM ('OPEN', 'CLOSED', 'LOCKED');

-- CreateEnum
CREATE TYPE "PeriodStatus" AS ENUM ('OPEN', 'SOFT_CLOSED', 'CLOSED', 'LOCKED');

-- CreateEnum
CREATE TYPE "GLAccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'COGS', 'EXPENSE', 'OTHER_INCOME', 'OTHER_EXPENSE');

-- CreateEnum
CREATE TYPE "NormalBalance" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "JournalStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'POSTED', 'REVERSED');

-- CreateEnum
CREATE TYPE "DocNumberStatus" AS ENUM ('ISSUED', 'VOIDED');

-- CreateEnum
CREATE TYPE "IdempotencyStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "FiscalYear" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "FiscalYearStatus" NOT NULL DEFAULT 'OPEN',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FiscalYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingPeriod" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fiscalYearId" TEXT NOT NULL,
    "periodNumber" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "PeriodStatus" NOT NULL DEFAULT 'OPEN',
    "closedById" TEXT,
    "closedAt" TIMESTAMP(3),
    "reopenedById" TEXT,
    "reopenedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeriodCloseLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "actorId" TEXT NOT NULL,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PeriodCloseLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GLAccount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "accountCode" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountType" "GLAccountType" NOT NULL,
    "normalBalance" "NormalBalance" NOT NULL,
    "parentAccountId" TEXT,
    "controlAccountType" TEXT,
    "currencyCode" TEXT,
    "allowManualPosting" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "description" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GLAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "journalNumber" TEXT,
    "journalType" TEXT NOT NULL DEFAULT 'GENERAL',
    "entryDate" TIMESTAMP(3) NOT NULL,
    "accountingPeriodId" TEXT,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "exchangeRate" DECIMAL(19,8) NOT NULL DEFAULT 1,
    "functionalCurrencyCode" TEXT NOT NULL DEFAULT 'USD',
    "sourceType" TEXT,
    "sourceId" TEXT,
    "sourceNumber" TEXT,
    "description" TEXT,
    "status" "JournalStatus" NOT NULL DEFAULT 'DRAFT',
    "reversalOfJournalEntryId" TEXT,
    "reversedByJournalEntryId" TEXT,
    "idempotencyKey" TEXT,
    "createdById" TEXT,
    "approvedById" TEXT,
    "postedById" TEXT,
    "reversalReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "postedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalItem" (
    "id" TEXT NOT NULL,
    "journalEntryId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "accountId" TEXT NOT NULL,
    "partyType" TEXT,
    "partyId" TEXT,
    "itemId" TEXT,
    "warehouseId" TEXT,
    "costCenter" TEXT,
    "projectId" TEXT,
    "description" TEXT,
    "debit" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "credit" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "transactionCurrency" TEXT NOT NULL DEFAULT 'USD',
    "transactionAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "exchangeRate" DECIMAL(19,8) NOT NULL DEFAULT 1,
    "functionalDebit" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "functionalCredit" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "taxCodeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntryLink" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "journalEntryId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'PRIMARY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalEntryLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentNumberCounter" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "fiscalYearCode" TEXT NOT NULL,
    "series" TEXT NOT NULL DEFAULT 'DEFAULT',
    "prefix" TEXT NOT NULL,
    "nextNumber" INTEGER NOT NULL DEFAULT 1,
    "padding" INTEGER NOT NULL DEFAULT 6,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentNumberCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentNumberHistory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "fiscalYearCode" TEXT NOT NULL,
    "series" TEXT NOT NULL DEFAULT 'DEFAULT',
    "documentNumber" TEXT NOT NULL,
    "recordType" TEXT,
    "recordId" TEXT,
    "status" "DocNumberStatus" NOT NULL DEFAULT 'ISSUED',
    "voidReason" TEXT,
    "voidedById" TEXT,
    "voidedAt" TIMESTAMP(3),
    "issuedById" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentNumberHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "status" "IdempotencyStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "responseBody" JSONB,
    "recordType" TEXT,
    "recordId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GLExchangeRate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "baseCurrency" TEXT NOT NULL,
    "quoteCurrency" TEXT NOT NULL,
    "rate" DECIMAL(19,8) NOT NULL,
    "rateDate" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GLExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemAuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "eventSequence" BIGINT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "requestId" TEXT,
    "correlationId" TEXT,
    "idempotencyKey" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "action" TEXT NOT NULL,
    "actionCategory" TEXT NOT NULL,
    "tableName" TEXT,
    "recordId" TEXT,
    "sourceDocumentType" TEXT,
    "sourceDocumentId" TEXT,
    "beforeState" JSONB,
    "afterState" JSONB,
    "changedFields" JSONB,
    "reason" TEXT,
    "approvalReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "previousHash" TEXT NOT NULL,
    "recordHash" TEXT NOT NULL,

    CONSTRAINT "SystemAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FiscalYear_tenantId_idx" ON "FiscalYear"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "FiscalYear_tenantId_code_key" ON "FiscalYear"("tenantId", "code");

-- CreateIndex
CREATE INDEX "AccountingPeriod_tenantId_startDate_endDate_idx" ON "AccountingPeriod"("tenantId", "startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingPeriod_tenantId_fiscalYearId_periodNumber_key" ON "AccountingPeriod"("tenantId", "fiscalYearId", "periodNumber");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingPeriod_tenantId_code_key" ON "AccountingPeriod"("tenantId", "code");

-- CreateIndex
CREATE INDEX "PeriodCloseLog_tenantId_idx" ON "PeriodCloseLog"("tenantId");

-- CreateIndex
CREATE INDEX "PeriodCloseLog_periodId_idx" ON "PeriodCloseLog"("periodId");

-- CreateIndex
CREATE INDEX "GLAccount_tenantId_accountType_idx" ON "GLAccount"("tenantId", "accountType");

-- CreateIndex
CREATE INDEX "GLAccount_tenantId_isActive_idx" ON "GLAccount"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "GLAccount_tenantId_accountCode_key" ON "GLAccount"("tenantId", "accountCode");

-- CreateIndex
CREATE UNIQUE INDEX "JournalEntry_reversalOfJournalEntryId_key" ON "JournalEntry"("reversalOfJournalEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "JournalEntry_reversedByJournalEntryId_key" ON "JournalEntry"("reversedByJournalEntryId");

-- CreateIndex
CREATE INDEX "JournalEntry_tenantId_status_idx" ON "JournalEntry"("tenantId", "status");

-- CreateIndex
CREATE INDEX "JournalEntry_tenantId_entryDate_idx" ON "JournalEntry"("tenantId", "entryDate");

-- CreateIndex
CREATE INDEX "JournalEntry_tenantId_sourceType_sourceId_idx" ON "JournalEntry"("tenantId", "sourceType", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "JournalEntry_tenantId_journalNumber_key" ON "JournalEntry"("tenantId", "journalNumber");

-- CreateIndex
CREATE UNIQUE INDEX "JournalEntry_tenantId_idempotencyKey_key" ON "JournalEntry"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "JournalItem_tenantId_accountId_idx" ON "JournalItem"("tenantId", "accountId");

-- CreateIndex
CREATE INDEX "JournalItem_journalEntryId_idx" ON "JournalItem"("journalEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "JournalItem_journalEntryId_lineNumber_key" ON "JournalItem"("journalEntryId", "lineNumber");

-- CreateIndex
CREATE INDEX "JournalEntryLink_journalEntryId_idx" ON "JournalEntryLink"("journalEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "JournalEntryLink_tenantId_sourceType_sourceId_purpose_key" ON "JournalEntryLink"("tenantId", "sourceType", "sourceId", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentNumberCounter_tenantId_documentType_fiscalYearCode__key" ON "DocumentNumberCounter"("tenantId", "documentType", "fiscalYearCode", "series");

-- CreateIndex
CREATE INDEX "DocumentNumberHistory_tenantId_documentType_fiscalYearCode_idx" ON "DocumentNumberHistory"("tenantId", "documentType", "fiscalYearCode");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentNumberHistory_tenantId_documentType_documentNumber_key" ON "DocumentNumberHistory"("tenantId", "documentType", "documentNumber");

-- CreateIndex
CREATE INDEX "IdempotencyRecord_tenantId_createdAt_idx" ON "IdempotencyRecord"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyRecord_tenantId_endpoint_idempotencyKey_key" ON "IdempotencyRecord"("tenantId", "endpoint", "idempotencyKey");

-- CreateIndex
CREATE INDEX "GLExchangeRate_tenantId_baseCurrency_quoteCurrency_rateDate_idx" ON "GLExchangeRate"("tenantId", "baseCurrency", "quoteCurrency", "rateDate");

-- CreateIndex
CREATE UNIQUE INDEX "GLExchangeRate_tenantId_baseCurrency_quoteCurrency_rateDate_key" ON "GLExchangeRate"("tenantId", "baseCurrency", "quoteCurrency", "rateDate", "source");

-- CreateIndex
CREATE INDEX "SystemAuditLog_tenantId_action_idx" ON "SystemAuditLog"("tenantId", "action");

-- CreateIndex
CREATE INDEX "SystemAuditLog_tenantId_tableName_recordId_idx" ON "SystemAuditLog"("tenantId", "tableName", "recordId");

-- CreateIndex
CREATE INDEX "SystemAuditLog_tenantId_createdAt_idx" ON "SystemAuditLog"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SystemAuditLog_tenantId_eventSequence_key" ON "SystemAuditLog"("tenantId", "eventSequence");

-- AddForeignKey
ALTER TABLE "AccountingPeriod" ADD CONSTRAINT "AccountingPeriod_fiscalYearId_fkey" FOREIGN KEY ("fiscalYearId") REFERENCES "FiscalYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodCloseLog" ADD CONSTRAINT "PeriodCloseLog_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "AccountingPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GLAccount" ADD CONSTRAINT "GLAccount_parentAccountId_fkey" FOREIGN KEY ("parentAccountId") REFERENCES "GLAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_accountingPeriodId_fkey" FOREIGN KEY ("accountingPeriodId") REFERENCES "AccountingPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_reversalOfJournalEntryId_fkey" FOREIGN KEY ("reversalOfJournalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalItem" ADD CONSTRAINT "JournalItem_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalItem" ADD CONSTRAINT "JournalItem_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "GLAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntryLink" ADD CONSTRAINT "JournalEntryLink_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ================================================================
-- HARDENING LAYER (appended after Prisma-generated DDL)
-- Audit-first controls: hash-chained audit ledger, journal posting
-- and reversal functions, immutability triggers, gapless numbering.
--
-- Trust model:
--  * All posting/reversal mutations of posted financial state are
--    permitted ONLY inside SECURITY-CONTROLLED functions which set
--    the transaction-local GUC app.posting_ctx = '1'.
--  * Audit rows are insertable ONLY via fn_append_audit_log which
--    sets the transaction-local GUC app.audit_ctx = '1'.
--  * Triggers reject every other mutation path, regardless of the
--    connected role. In production, additionally split DB roles
--    (migration / runtime / read-only) and REVOKE direct DML on
--    posted-ledger tables from the runtime role.
-- ================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------
-- C1. AUDIT LEDGER: restricted insert with per-tenant hash chain
-- ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_append_audit_log(
  p_tenant_id            TEXT,
  p_user_id              TEXT,
  p_action               TEXT,
  p_action_category      TEXT,
  p_table_name           TEXT DEFAULT NULL,
  p_record_id            TEXT DEFAULT NULL,
  p_before_state         JSONB DEFAULT NULL,
  p_after_state          JSONB DEFAULT NULL,
  p_reason               TEXT DEFAULT NULL,
  p_branch_id            TEXT DEFAULT NULL,
  p_request_id           TEXT DEFAULT NULL,
  p_correlation_id       TEXT DEFAULT NULL,
  p_idempotency_key      TEXT DEFAULT NULL,
  p_source_document_type TEXT DEFAULT NULL,
  p_source_document_id   TEXT DEFAULT NULL,
  p_approval_reference   TEXT DEFAULT NULL,
  p_ip_address           TEXT DEFAULT NULL,
  p_user_agent           TEXT DEFAULT NULL,
  p_session_id           TEXT DEFAULT NULL
) RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_id            TEXT := gen_random_uuid()::text;
  v_prev_seq      BIGINT := 0;
  v_prev_hash     TEXT := 'GENESIS';
  v_seq           BIGINT;
  v_created_at    TIMESTAMP(3) := now();
  v_hash          TEXT;
BEGIN
  IF p_tenant_id IS NULL OR length(p_tenant_id) = 0 THEN
    RAISE EXCEPTION 'AUDIT_TENANT_REQUIRED: tenant id is required for audit events';
  END IF;
  IF p_action IS NULL OR length(p_action) = 0 THEN
    RAISE EXCEPTION 'AUDIT_ACTION_REQUIRED: action is required for audit events';
  END IF;

  -- Serialize appends per tenant so the chain is strictly ordered.
  PERFORM pg_advisory_xact_lock(hashtext('sysaudit:' || p_tenant_id));

  SELECT "eventSequence", "recordHash"
    INTO v_prev_seq, v_prev_hash
    FROM "SystemAuditLog"
   WHERE "tenantId" = p_tenant_id
   ORDER BY "eventSequence" DESC
   LIMIT 1;

  IF NOT FOUND THEN
    v_prev_seq := 0;
    v_prev_hash := 'GENESIS';
  END IF;

  v_seq := v_prev_seq + 1;

  v_hash := encode(digest(concat_ws('|',
    v_prev_hash,
    p_tenant_id,
    v_seq::text,
    coalesce(p_user_id, ''),
    p_action,
    p_action_category,
    coalesce(p_table_name, ''),
    coalesce(p_record_id, ''),
    coalesce(p_before_state::text, ''),
    coalesce(p_after_state::text, ''),
    coalesce(p_reason, ''),
    to_char(v_created_at, 'YYYY-MM-DD HH24:MI:SS.MS')
  ), 'sha256'), 'hex');

  PERFORM set_config('app.audit_ctx', '1', true);

  INSERT INTO "SystemAuditLog" (
    "id", "tenantId", "branchId", "eventSequence", "userId", "sessionId",
    "requestId", "correlationId", "idempotencyKey", "ipAddress", "userAgent",
    "action", "actionCategory", "tableName", "recordId",
    "sourceDocumentType", "sourceDocumentId",
    "beforeState", "afterState", "changedFields",
    "reason", "approvalReference", "createdAt", "previousHash", "recordHash"
  ) VALUES (
    v_id, p_tenant_id, p_branch_id, v_seq, p_user_id, p_session_id,
    p_request_id, p_correlation_id, p_idempotency_key, p_ip_address, p_user_agent,
    p_action, p_action_category, p_table_name, p_record_id,
    p_source_document_type, p_source_document_id,
    p_before_state, p_after_state, NULL,
    p_reason, p_approval_reference, v_created_at, v_prev_hash, v_hash
  );

  PERFORM set_config('app.audit_ctx', '', true);

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION fn_guard_audit_insert() RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF coalesce(current_setting('app.audit_ctx', true), '') <> '1' THEN
    RAISE EXCEPTION 'AUDIT_DIRECT_INSERT_FORBIDDEN: insert audit events via fn_append_audit_log only';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION fn_block_audit_mutation() RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'AUDIT_IMMUTABLE: audit ledger rows can never be updated or deleted';
END;
$$;

CREATE TRIGGER trg_sysaudit_guard_insert
  BEFORE INSERT ON "SystemAuditLog"
  FOR EACH ROW EXECUTE FUNCTION fn_guard_audit_insert();

CREATE TRIGGER trg_sysaudit_block_update
  BEFORE UPDATE ON "SystemAuditLog"
  FOR EACH ROW EXECUTE FUNCTION fn_block_audit_mutation();

CREATE TRIGGER trg_sysaudit_block_delete
  BEFORE DELETE ON "SystemAuditLog"
  FOR EACH ROW EXECUTE FUNCTION fn_block_audit_mutation();

-- Tamper-evidence verification: recomputes the hash chain.
CREATE OR REPLACE FUNCTION fn_verify_audit_chain(p_tenant_id TEXT)
RETURNS TABLE (is_valid BOOLEAN, checked_count BIGINT, broken_at_sequence BIGINT, detail TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  r              RECORD;
  v_prev_hash    TEXT := 'GENESIS';
  v_expected_seq BIGINT := 1;
  v_count        BIGINT := 0;
  v_hash         TEXT;
BEGIN
  FOR r IN
    SELECT * FROM "SystemAuditLog"
     WHERE "tenantId" = p_tenant_id
     ORDER BY "eventSequence" ASC
  LOOP
    IF r."eventSequence" <> v_expected_seq THEN
      RETURN QUERY SELECT false, v_count, r."eventSequence",
        format('Sequence gap: expected %s found %s', v_expected_seq, r."eventSequence");
      RETURN;
    END IF;

    IF r."previousHash" <> v_prev_hash THEN
      RETURN QUERY SELECT false, v_count, r."eventSequence",
        format('Previous-hash mismatch at sequence %s', r."eventSequence");
      RETURN;
    END IF;

    v_hash := encode(digest(concat_ws('|',
      v_prev_hash,
      r."tenantId",
      r."eventSequence"::text,
      coalesce(r."userId", ''),
      r."action",
      r."actionCategory",
      coalesce(r."tableName", ''),
      coalesce(r."recordId", ''),
      coalesce(r."beforeState"::text, ''),
      coalesce(r."afterState"::text, ''),
      coalesce(r."reason", ''),
      to_char(r."createdAt", 'YYYY-MM-DD HH24:MI:SS.MS')
    ), 'sha256'), 'hex');

    IF v_hash <> r."recordHash" THEN
      RETURN QUERY SELECT false, v_count, r."eventSequence",
        format('Record-hash mismatch at sequence %s (row content altered)', r."eventSequence");
      RETURN;
    END IF;

    v_prev_hash := r."recordHash";
    v_expected_seq := v_expected_seq + 1;
    v_count := v_count + 1;
  END LOOP;

  RETURN QUERY SELECT true, v_count, NULL::BIGINT, 'Audit chain intact'::TEXT;
END;
$$;

-- ----------------------------------------------------------------
-- E1. GAPLESS DOCUMENT NUMBERING
-- Counter is locked FOR UPDATE inside the caller's transaction, so
-- a rollback releases the number without consuming it, while a
-- commit makes it permanent. History rows keep voided numbers in
-- the register forever.
-- ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_allocate_document_number(
  p_tenant_id        TEXT,
  p_document_type    TEXT,
  p_fiscal_year_code TEXT,
  p_series           TEXT DEFAULT 'DEFAULT',
  p_prefix           TEXT DEFAULT NULL,
  p_padding          INT DEFAULT 6,
  p_record_type      TEXT DEFAULT NULL,
  p_record_id        TEXT DEFAULT NULL,
  p_user_id          TEXT DEFAULT NULL
) RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_prefix TEXT := coalesce(p_prefix, p_document_type);
  v_number INT;
  v_padding INT;
  v_document_number TEXT;
BEGIN
  INSERT INTO "DocumentNumberCounter" (
    "id", "tenantId", "documentType", "fiscalYearCode", "series",
    "prefix", "nextNumber", "padding", "createdAt", "updatedAt"
  ) VALUES (
    gen_random_uuid()::text, p_tenant_id, p_document_type, p_fiscal_year_code,
    coalesce(p_series, 'DEFAULT'), v_prefix, 1, coalesce(p_padding, 6), now(), now()
  )
  ON CONFLICT ("tenantId", "documentType", "fiscalYearCode", "series") DO NOTHING;

  SELECT "nextNumber", "padding", "prefix"
    INTO v_number, v_padding, v_prefix
    FROM "DocumentNumberCounter"
   WHERE "tenantId" = p_tenant_id
     AND "documentType" = p_document_type
     AND "fiscalYearCode" = p_fiscal_year_code
     AND "series" = coalesce(p_series, 'DEFAULT')
   FOR UPDATE;

  v_document_number := v_prefix || '-' || p_fiscal_year_code || '-' || lpad(v_number::text, v_padding, '0');

  UPDATE "DocumentNumberCounter"
     SET "nextNumber" = v_number + 1,
         "updatedAt" = now()
   WHERE "tenantId" = p_tenant_id
     AND "documentType" = p_document_type
     AND "fiscalYearCode" = p_fiscal_year_code
     AND "series" = coalesce(p_series, 'DEFAULT');

  INSERT INTO "DocumentNumberHistory" (
    "id", "tenantId", "documentType", "fiscalYearCode", "series",
    "documentNumber", "recordType", "recordId", "status", "issuedById", "issuedAt"
  ) VALUES (
    gen_random_uuid()::text, p_tenant_id, p_document_type, p_fiscal_year_code,
    coalesce(p_series, 'DEFAULT'), v_document_number, p_record_type, p_record_id,
    'ISSUED', p_user_id, now()
  );

  RETURN v_document_number;
END;
$$;

-- Number register immutability: numbers may only move ISSUED -> VOIDED.
CREATE OR REPLACE FUNCTION fn_guard_number_history() RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'DOCNUM_IMMUTABLE: issued document numbers can never be deleted from the register';
  END IF;

  IF OLD."documentNumber" IS DISTINCT FROM NEW."documentNumber"
     OR OLD."tenantId" IS DISTINCT FROM NEW."tenantId"
     OR OLD."documentType" IS DISTINCT FROM NEW."documentType"
     OR OLD."fiscalYearCode" IS DISTINCT FROM NEW."fiscalYearCode"
     OR OLD."series" IS DISTINCT FROM NEW."series"
     OR OLD."issuedAt" IS DISTINCT FROM NEW."issuedAt"
     OR OLD."issuedById" IS DISTINCT FROM NEW."issuedById" THEN
    RAISE EXCEPTION 'DOCNUM_IMMUTABLE: issued document numbers cannot be edited';
  END IF;

  IF OLD."status" = 'VOIDED' THEN
    RAISE EXCEPTION 'DOCNUM_IMMUTABLE: a voided number record cannot change again';
  END IF;

  IF NEW."status" = 'VOIDED' AND (NEW."voidReason" IS NULL OR length(NEW."voidReason") = 0) THEN
    RAISE EXCEPTION 'DOCNUM_VOID_REASON_REQUIRED: voiding a document number requires a reason';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_docnum_history_guard
  BEFORE UPDATE OR DELETE ON "DocumentNumberHistory"
  FOR EACH ROW EXECUTE FUNCTION fn_guard_number_history();

-- ----------------------------------------------------------------
-- D1. JOURNAL IMMUTABILITY TRIGGERS
-- ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_guard_journal_entry() RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_posting BOOLEAN := coalesce(current_setting('app.posting_ctx', true), '') = '1';
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."status" IN ('POSTED', 'REVERSED') THEN
      RAISE EXCEPTION 'JOURNAL_IMMUTABLE: posted journal entries cannot be deleted (use fn_reverse_journal_entry)';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW."status" IN ('POSTED', 'REVERSED') AND NOT v_posting THEN
      RAISE EXCEPTION 'JOURNAL_POST_FORBIDDEN: journals can only be posted via fn_post_journal_entry';
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE
  IF OLD."status" NOT IN ('POSTED', 'REVERSED') THEN
    -- Draft/approval-stage entries: block illegal jumps to POSTED outside the posting function.
    IF NEW."status" IN ('POSTED', 'REVERSED') AND NOT v_posting THEN
      RAISE EXCEPTION 'JOURNAL_POST_FORBIDDEN: journals can only be posted via fn_post_journal_entry';
    END IF;
    RETURN NEW;
  END IF;

  -- OLD is POSTED or REVERSED: only the controlled reversal transition is allowed.
  IF NOT v_posting THEN
    RAISE EXCEPTION 'JOURNAL_IMMUTABLE: posted journal entries cannot be modified';
  END IF;

  IF OLD."tenantId" IS DISTINCT FROM NEW."tenantId"
     OR OLD."journalNumber" IS DISTINCT FROM NEW."journalNumber"
     OR OLD."journalType" IS DISTINCT FROM NEW."journalType"
     OR OLD."entryDate" IS DISTINCT FROM NEW."entryDate"
     OR OLD."accountingPeriodId" IS DISTINCT FROM NEW."accountingPeriodId"
     OR OLD."currencyCode" IS DISTINCT FROM NEW."currencyCode"
     OR OLD."exchangeRate" IS DISTINCT FROM NEW."exchangeRate"
     OR OLD."functionalCurrencyCode" IS DISTINCT FROM NEW."functionalCurrencyCode"
     OR OLD."sourceType" IS DISTINCT FROM NEW."sourceType"
     OR OLD."sourceId" IS DISTINCT FROM NEW."sourceId"
     OR OLD."postedAt" IS DISTINCT FROM NEW."postedAt"
     OR OLD."postedById" IS DISTINCT FROM NEW."postedById"
     OR OLD."createdById" IS DISTINCT FROM NEW."createdById"
     OR OLD."reversalOfJournalEntryId" IS DISTINCT FROM NEW."reversalOfJournalEntryId" THEN
    RAISE EXCEPTION 'JOURNAL_IMMUTABLE: financial fields of a posted journal entry cannot change';
  END IF;

  IF NOT (OLD."status" = 'POSTED' AND NEW."status" = 'REVERSED'
          AND OLD."reversedByJournalEntryId" IS NULL
          AND NEW."reversedByJournalEntryId" IS NOT NULL)
     AND OLD."status" IS DISTINCT FROM NEW."status" THEN
    RAISE EXCEPTION 'JOURNAL_IMMUTABLE: only POSTED -> REVERSED transition is permitted';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_journal_entry_guard
  BEFORE INSERT OR UPDATE OR DELETE ON "JournalEntry"
  FOR EACH ROW EXECUTE FUNCTION fn_guard_journal_entry();

CREATE OR REPLACE FUNCTION fn_guard_journal_item() RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_status "JournalStatus";
  v_entry_id TEXT;
BEGIN
  v_entry_id := CASE WHEN TG_OP = 'DELETE' THEN OLD."journalEntryId" ELSE NEW."journalEntryId" END;

  SELECT "status" INTO v_status FROM "JournalEntry" WHERE "id" = v_entry_id;

  IF v_status IN ('POSTED', 'REVERSED') THEN
    RAISE EXCEPTION 'JOURNAL_ITEM_IMMUTABLE: items of a posted journal entry cannot be inserted, updated or deleted';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_journal_item_guard
  BEFORE INSERT OR UPDATE OR DELETE ON "JournalItem"
  FOR EACH ROW EXECUTE FUNCTION fn_guard_journal_item();

-- Row-level sanity: a line is a pure debit or a pure credit, never both, never negative.
ALTER TABLE "JournalItem"
  ADD CONSTRAINT chk_journal_item_amounts CHECK (
    "debit" >= 0 AND "credit" >= 0
    AND "functionalDebit" >= 0 AND "functionalCredit" >= 0
    AND (("debit" > 0 AND "credit" = 0) OR ("credit" > 0 AND "debit" = 0))
    AND (("functionalDebit" > 0 AND "functionalCredit" = 0) OR ("functionalCredit" > 0 AND "functionalDebit" = 0))
  );

-- Locked accounting periods can never be reopened.
CREATE OR REPLACE FUNCTION fn_guard_accounting_period() RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'PERIOD_IMMUTABLE: accounting periods cannot be deleted';
  END IF;
  IF OLD."status" = 'LOCKED' AND NEW."status" <> 'LOCKED' THEN
    RAISE EXCEPTION 'PERIOD_LOCKED: a permanently locked period can never be reopened';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_accounting_period_guard
  BEFORE UPDATE OR DELETE ON "AccountingPeriod"
  FOR EACH ROW EXECUTE FUNCTION fn_guard_accounting_period();

-- ----------------------------------------------------------------
-- D2. POSTING FUNCTION
-- The ONLY path by which a journal entry becomes POSTED.
-- Fails closed on every integrity violation.
-- ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_post_journal_entry(
  p_journal_id      TEXT,
  p_tenant_id       TEXT,
  p_poster_id       TEXT,
  p_allow_self_post BOOLEAN DEFAULT FALSE
) RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_entry           "JournalEntry"%ROWTYPE;
  v_period          "AccountingPeriod"%ROWTYPE;
  v_fy_code         TEXT;
  v_line_count      INT;
  v_bad_lines       INT;
  v_bad_accounts    INT;
  v_sum_debit       NUMERIC(19,4);
  v_sum_credit      NUMERIC(19,4);
  v_journal_number  TEXT;
BEGIN
  PERFORM set_config('app.posting_ctx', '1', true);

  SELECT * INTO v_entry
    FROM "JournalEntry"
   WHERE "id" = p_journal_id AND "tenantId" = p_tenant_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'JOURNAL_NOT_FOUND: journal entry % does not exist in tenant', p_journal_id;
  END IF;

  IF v_entry."status" = 'POSTED' THEN
    RAISE EXCEPTION 'JOURNAL_ALREADY_POSTED: journal entry % is already posted as %', p_journal_id, v_entry."journalNumber";
  END IF;
  IF v_entry."status" = 'REVERSED' THEN
    RAISE EXCEPTION 'JOURNAL_ALREADY_REVERSED: journal entry % has been reversed', p_journal_id;
  END IF;
  IF v_entry."status" = 'PENDING_APPROVAL' THEN
    RAISE EXCEPTION 'JOURNAL_NOT_APPROVED: journal entry % is awaiting approval', p_journal_id;
  END IF;

  -- Segregation of duties: the creator of a MANUAL journal may not post
  -- it without an independent approval, unless explicitly excepted.
  IF v_entry."journalType" = 'MANUAL' AND NOT p_allow_self_post THEN
    IF v_entry."createdById" IS NOT NULL AND v_entry."createdById" = p_poster_id
       AND (v_entry."approvedById" IS NULL OR v_entry."approvedById" = p_poster_id) THEN
      RAISE EXCEPTION 'SOD_VIOLATION: the creator of a manual journal cannot post it without independent approval';
    END IF;
  END IF;

  -- Resolve and validate the accounting period from the entry date.
  IF v_entry."accountingPeriodId" IS NOT NULL THEN
    SELECT * INTO v_period FROM "AccountingPeriod"
     WHERE "id" = v_entry."accountingPeriodId" AND "tenantId" = p_tenant_id;
  ELSE
    SELECT * INTO v_period FROM "AccountingPeriod"
     WHERE "tenantId" = p_tenant_id
       AND v_entry."entryDate" >= "startDate"
       AND v_entry."entryDate" <= "endDate"
     ORDER BY "startDate" ASC
     LIMIT 1;
  END IF;

  IF v_period."id" IS NULL THEN
    RAISE EXCEPTION 'PERIOD_NOT_FOUND: no accounting period covers entry date %', v_entry."entryDate";
  END IF;
  IF v_period."status" <> 'OPEN' THEN
    RAISE EXCEPTION 'PERIOD_CLOSED: accounting period % is % â€” posting rejected', v_period."code", v_period."status";
  END IF;

  SELECT fy."code" INTO v_fy_code FROM "FiscalYear" fy WHERE fy."id" = v_period."fiscalYearId";

  -- Validate journal items.
  SELECT count(*),
         count(*) FILTER (WHERE NOT ((ji."debit" > 0 AND ji."credit" = 0) OR (ji."credit" > 0 AND ji."debit" = 0))),
         coalesce(sum(ji."functionalDebit"), 0),
         coalesce(sum(ji."functionalCredit"), 0)
    INTO v_line_count, v_bad_lines, v_sum_debit, v_sum_credit
    FROM "JournalItem" ji
   WHERE ji."journalEntryId" = v_entry."id";

  IF v_line_count < 2 THEN
    RAISE EXCEPTION 'JOURNAL_INCOMPLETE: a journal entry requires at least two lines (found %)', v_line_count;
  END IF;
  IF v_bad_lines > 0 THEN
    RAISE EXCEPTION 'JOURNAL_LINE_INVALID: % line(s) are not a pure positive debit or pure positive credit', v_bad_lines;
  END IF;
  IF v_sum_debit <> v_sum_credit THEN
    RAISE EXCEPTION 'JOURNAL_UNBALANCED: functional debits (%) do not equal functional credits (%)', v_sum_debit, v_sum_credit;
  END IF;
  IF v_sum_debit <= 0 THEN
    RAISE EXCEPTION 'JOURNAL_ZERO_VALUE: a journal entry must move a positive amount';
  END IF;

  -- Validate accounts: tenant-owned, active, and manual-posting policy.
  SELECT count(*) INTO v_bad_accounts
    FROM "JournalItem" ji
    LEFT JOIN "GLAccount" a
      ON a."id" = ji."accountId" AND a."tenantId" = p_tenant_id AND a."isActive" = true
   WHERE ji."journalEntryId" = v_entry."id"
     AND a."id" IS NULL;
  IF v_bad_accounts > 0 THEN
    RAISE EXCEPTION 'ACCOUNT_INVALID: % line(s) reference missing, foreign-tenant or inactive accounts', v_bad_accounts;
  END IF;

  IF v_entry."journalType" = 'MANUAL' THEN
    SELECT count(*) INTO v_bad_accounts
      FROM "JournalItem" ji
      JOIN "GLAccount" a ON a."id" = ji."accountId"
     WHERE ji."journalEntryId" = v_entry."id"
       AND a."allowManualPosting" = false;
    IF v_bad_accounts > 0 THEN
      RAISE EXCEPTION 'CONTROL_ACCOUNT_PROTECTED: % line(s) post manually to control accounts that forbid manual posting', v_bad_accounts;
    END IF;
  END IF;

  -- Duplicate-posting prevention: one PRIMARY journal per source document.
  IF v_entry."sourceType" IS NOT NULL AND v_entry."sourceId" IS NOT NULL THEN
    BEGIN
      INSERT INTO "JournalEntryLink" ("id", "tenantId", "journalEntryId", "sourceType", "sourceId", "purpose", "createdAt")
      VALUES (gen_random_uuid()::text, p_tenant_id, v_entry."id", v_entry."sourceType", v_entry."sourceId", 'PRIMARY', now());
    EXCEPTION WHEN unique_violation THEN
      RAISE EXCEPTION 'DUPLICATE_POSTING: source document %/% already has a posted journal entry',
        v_entry."sourceType", v_entry."sourceId";
    END;
  END IF;

  -- Gapless statutory number, allocated inside this same transaction.
  v_journal_number := fn_allocate_document_number(
    p_tenant_id, 'JOURNAL_ENTRY', v_fy_code, 'DEFAULT', 'JE', 6, 'JournalEntry', v_entry."id", p_poster_id
  );

  UPDATE "JournalEntry"
     SET "status" = 'POSTED',
         "journalNumber" = v_journal_number,
         "accountingPeriodId" = v_period."id",
         "postedById" = p_poster_id,
         "postedAt" = now(),
         "updatedAt" = now()
   WHERE "id" = v_entry."id";

  PERFORM fn_append_audit_log(
    p_tenant_id, p_poster_id, 'JOURNAL_POSTED', 'FINANCIAL',
    'JournalEntry', v_entry."id",
    jsonb_build_object('status', v_entry."status"),
    jsonb_build_object('status', 'POSTED', 'journalNumber', v_journal_number,
                       'functionalDebit', v_sum_debit, 'functionalCredit', v_sum_credit,
                       'periodCode', v_period."code"),
    NULL, v_entry."branchId",
    NULL, NULL, v_entry."idempotencyKey",
    v_entry."sourceType", v_entry."sourceId", NULL, NULL, NULL, NULL
  );

  PERFORM set_config('app.posting_ctx', '', true);

  RETURN v_journal_number;
END;
$$;

-- ----------------------------------------------------------------
-- D3. REVERSAL FUNCTION
-- Never mutates original financial values: creates a mirrored
-- opposite entry, links both directions, marks original REVERSED.
-- ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_reverse_journal_entry(
  p_journal_id  TEXT,
  p_tenant_id   TEXT,
  p_reverser_id TEXT,
  p_reason      TEXT,
  p_entry_date  TIMESTAMP DEFAULT NULL
) RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_original       "JournalEntry"%ROWTYPE;
  v_reversal_id    TEXT := gen_random_uuid()::text;
  v_reversal_date  TIMESTAMP(3);
  v_journal_number TEXT;
BEGIN
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'REVERSAL_REASON_REQUIRED: reversing a posted journal requires a reason';
  END IF;

  PERFORM set_config('app.posting_ctx', '1', true);

  SELECT * INTO v_original
    FROM "JournalEntry"
   WHERE "id" = p_journal_id AND "tenantId" = p_tenant_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'JOURNAL_NOT_FOUND: journal entry % does not exist in tenant', p_journal_id;
  END IF;
  IF v_original."status" <> 'POSTED' THEN
    RAISE EXCEPTION 'REVERSAL_INVALID_STATE: only POSTED journal entries can be reversed (current: %)', v_original."status";
  END IF;
  IF v_original."reversedByJournalEntryId" IS NOT NULL THEN
    RAISE EXCEPTION 'REVERSAL_DUPLICATE: journal entry % is already reversed', v_original."journalNumber";
  END IF;

  v_reversal_date := coalesce(p_entry_date, now());

  INSERT INTO "JournalEntry" (
    "id", "tenantId", "branchId", "journalType", "entryDate",
    "currencyCode", "exchangeRate", "functionalCurrencyCode",
    "sourceType", "sourceId", "sourceNumber",
    "description", "status", "reversalOfJournalEntryId", "reversalReason",
    "createdById", "createdAt", "updatedAt"
  ) VALUES (
    v_reversal_id, v_original."tenantId", v_original."branchId", 'REVERSAL', v_reversal_date,
    v_original."currencyCode", v_original."exchangeRate", v_original."functionalCurrencyCode",
    v_original."sourceType", v_original."sourceId", v_original."sourceNumber",
    'Reversal of ' || coalesce(v_original."journalNumber", v_original."id") || ': ' || p_reason,
    'DRAFT', v_original."id", p_reason,
    p_reverser_id, now(), now()
  );

  -- Mirrored items: debits and credits swapped, everything else preserved.
  INSERT INTO "JournalItem" (
    "id", "journalEntryId", "tenantId", "lineNumber", "accountId",
    "partyType", "partyId", "itemId", "warehouseId", "costCenter", "projectId",
    "description", "debit", "credit",
    "transactionCurrency", "transactionAmount", "exchangeRate",
    "functionalDebit", "functionalCredit", "taxCodeId", "createdAt"
  )
  SELECT
    gen_random_uuid()::text, v_reversal_id, ji."tenantId", ji."lineNumber", ji."accountId",
    ji."partyType", ji."partyId", ji."itemId", ji."warehouseId", ji."costCenter", ji."projectId",
    'Reversal: ' || coalesce(ji."description", ''), ji."credit", ji."debit",
    ji."transactionCurrency", ji."transactionAmount", ji."exchangeRate",
    ji."functionalCredit", ji."functionalDebit", ji."taxCodeId", now()
  FROM "JournalItem" ji
  WHERE ji."journalEntryId" = v_original."id";

  -- Post the reversal through the same hardened path (period checks,
  -- balance checks, gapless numbering). Reversals are system journals,
  -- so self-post is permitted.
  v_journal_number := fn_post_journal_entry(v_reversal_id, p_tenant_id, p_reverser_id, TRUE);

  UPDATE "JournalEntry"
     SET "status" = 'REVERSED',
         "reversedByJournalEntryId" = v_reversal_id,
         "updatedAt" = now()
   WHERE "id" = v_original."id";

  IF v_original."sourceType" IS NOT NULL AND v_original."sourceId" IS NOT NULL THEN
    BEGIN
      INSERT INTO "JournalEntryLink" ("id", "tenantId", "journalEntryId", "sourceType", "sourceId", "purpose", "createdAt")
      VALUES (gen_random_uuid()::text, p_tenant_id, v_reversal_id, v_original."sourceType", v_original."sourceId", 'REVERSAL', now());
    EXCEPTION WHEN unique_violation THEN
      RAISE EXCEPTION 'REVERSAL_DUPLICATE: source document %/% already has a reversal journal',
        v_original."sourceType", v_original."sourceId";
    END;
  END IF;

  PERFORM fn_append_audit_log(
    p_tenant_id, p_reverser_id, 'JOURNAL_REVERSED', 'FINANCIAL',
    'JournalEntry', v_original."id",
    jsonb_build_object('status', 'POSTED', 'journalNumber', v_original."journalNumber"),
    jsonb_build_object('status', 'REVERSED', 'reversedBy', v_reversal_id, 'reversalNumber', v_journal_number),
    p_reason, v_original."branchId",
    NULL, NULL, NULL,
    v_original."sourceType", v_original."sourceId", NULL, NULL, NULL, NULL
  );

  PERFORM set_config('app.posting_ctx', '', true);

  RETURN v_reversal_id;
END;
$$;
