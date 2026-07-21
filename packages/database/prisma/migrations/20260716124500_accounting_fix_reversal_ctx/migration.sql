-- Fix: fn_post_journal_entry clears app.posting_ctx when it finishes,
-- which disarmed the guard exemption for the remainder of
-- fn_reverse_journal_entry (the original-entry REVERSED update was
-- rejected by trg_journal_entry_guard). Re-arm the posting context
-- after the nested posting call.

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

  v_journal_number := fn_post_journal_entry(v_reversal_id, p_tenant_id, p_reverser_id, TRUE);

  -- fn_post_journal_entry clears the posting context; re-arm it for the
  -- controlled POSTED -> REVERSED transition below.
  PERFORM set_config('app.posting_ctx', '1', true);

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
