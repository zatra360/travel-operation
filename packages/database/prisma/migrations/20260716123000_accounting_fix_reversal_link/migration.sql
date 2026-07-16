-- Fix: a reversal entry carries the same sourceType/sourceId as its
-- original so the register stays traceable, but it must not claim the
-- PRIMARY posting slot for that source document. The REVERSAL-purpose
-- link is created by fn_reverse_journal_entry instead.

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

  IF v_entry."journalType" = 'MANUAL' AND NOT p_allow_self_post THEN
    IF v_entry."createdById" IS NOT NULL AND v_entry."createdById" = p_poster_id
       AND (v_entry."approvedById" IS NULL OR v_entry."approvedById" = p_poster_id) THEN
      RAISE EXCEPTION 'SOD_VIOLATION: the creator of a manual journal cannot post it without independent approval';
    END IF;
  END IF;

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
    RAISE EXCEPTION 'PERIOD_CLOSED: accounting period % is % — posting rejected', v_period."code", v_period."status";
  END IF;

  SELECT fy."code" INTO v_fy_code FROM "FiscalYear" fy WHERE fy."id" = v_period."fiscalYearId";

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

  -- Duplicate-posting prevention applies to primary postings only.
  -- Reversal entries link to their source with purpose REVERSAL,
  -- created by fn_reverse_journal_entry.
  IF v_entry."sourceType" IS NOT NULL AND v_entry."sourceId" IS NOT NULL
     AND v_entry."reversalOfJournalEntryId" IS NULL THEN
    BEGIN
      INSERT INTO "JournalEntryLink" ("id", "tenantId", "journalEntryId", "sourceType", "sourceId", "purpose", "createdAt")
      VALUES (gen_random_uuid()::text, p_tenant_id, v_entry."id", v_entry."sourceType", v_entry."sourceId", 'PRIMARY', now());
    EXCEPTION WHEN unique_violation THEN
      RAISE EXCEPTION 'DUPLICATE_POSTING: source document %/% already has a posted journal entry',
        v_entry."sourceType", v_entry."sourceId";
    END;
  END IF;

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
