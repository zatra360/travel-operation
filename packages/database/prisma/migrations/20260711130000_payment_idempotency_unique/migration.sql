-- Enforce payment idempotency at the database level.
-- NULL idempotencyKey values remain allowed and are treated as distinct by
-- Postgres, so payments without a key are unaffected.
DROP INDEX IF EXISTS "Payment_idempotencyKey_idx";
CREATE UNIQUE INDEX "Payment_tenantId_idempotencyKey_key" ON "Payment"("tenantId", "idempotencyKey");
