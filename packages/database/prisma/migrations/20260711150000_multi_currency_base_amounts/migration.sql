-- F-10: record currency conversion at transaction time so base-currency
-- reporting/reconciliation is stable regardless of later rate changes.
-- Defaults keep existing single-currency data valid (rate 1, base = amount later).
ALTER TABLE "Payment" ADD COLUMN "exchangeRate" numeric(19,4) NOT NULL DEFAULT 1;
ALTER TABLE "Payment" ADD COLUMN "baseCurrencyCode" TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE "Payment" ADD COLUMN "baseAmount" numeric(19,4) NOT NULL DEFAULT 0;

ALTER TABLE "Invoice" ADD COLUMN "exchangeRate" numeric(19,4) NOT NULL DEFAULT 1;
ALTER TABLE "Invoice" ADD COLUMN "baseCurrencyCode" TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE "Invoice" ADD COLUMN "baseAmount" numeric(19,4) NOT NULL DEFAULT 0;

ALTER TABLE "LedgerEntry" ADD COLUMN "exchangeRate" numeric(19,4) NOT NULL DEFAULT 1;
ALTER TABLE "LedgerEntry" ADD COLUMN "baseCurrencyCode" TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE "LedgerEntry" ADD COLUMN "baseAmount" numeric(19,4) NOT NULL DEFAULT 0;

-- Backfill base amounts for existing rows (rate 1 assumption for legacy data).
UPDATE "Payment" SET "baseAmount" = "amount", "baseCurrencyCode" = "currencyCode" WHERE "baseAmount" = 0;
UPDATE "Invoice" SET "baseAmount" = "totalAmount", "baseCurrencyCode" = "currencyCode" WHERE "baseAmount" = 0;
UPDATE "LedgerEntry" SET "baseAmount" = "amount", "baseCurrencyCode" = "currencyCode" WHERE "baseAmount" = 0;
