-- AlterTable
ALTER TABLE "InvoiceLine" ADD COLUMN     "serviceTypeId" TEXT;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "serviceTypeId" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "serviceTypeId" TEXT;

-- AlterTable
ALTER TABLE "QuotationLineItem" ADD COLUMN     "serviceTypeId" TEXT;

-- AlterTable
ALTER TABLE "ServiceItem" ADD COLUMN     "serviceTypeId" TEXT;

-- CreateIndex
CREATE INDEX "InvoiceLine_serviceTypeId_idx" ON "InvoiceLine"("serviceTypeId");

-- CreateIndex
CREATE INDEX "Lead_serviceTypeId_idx" ON "Lead"("serviceTypeId");

-- CreateIndex
CREATE INDEX "QuotationLineItem_serviceTypeId_idx" ON "QuotationLineItem"("serviceTypeId");


-- ================================================================
-- Backfill: normalize legacy serviceType strings to the ServiceType
-- master. Unknown values are left untouched (the string column stays
-- as the fallback for them). Legacy aliases: FLIGHT/AIR/TICKET -> AIR_TICKET.
-- PACKAGE has no system equivalent and stays string-only.
-- ================================================================

INSERT INTO "ServiceType" ("id", "systemCode", "displayName", "slug", "icon", "category", "displayOrder", "isSystem", "supportsTicketing", "supportsApplication", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'AIR_TICKET', 'Air Ticket', 'air-ticket', 'plane', 'TRAVEL', 1, true, true, false, now(), now()),
  (gen_random_uuid()::text, 'VISA', 'Visa Processing', 'visa', 'file-check', 'TRAVEL', 2, true, false, true, now(), now()),
  (gen_random_uuid()::text, 'HOTEL', 'Hotel Booking', 'hotel', 'building', 'TRAVEL', 3, true, false, false, now(), now()),
  (gen_random_uuid()::text, 'TOUR', 'Tour Package', 'tour', 'map', 'TRAVEL', 4, true, false, false, now(), now()),
  (gen_random_uuid()::text, 'INSURANCE', 'Travel Insurance', 'insurance', 'shield', 'TRAVEL', 5, true, false, false, now(), now()),
  (gen_random_uuid()::text, 'TRANSFER', 'Airport Transfer', 'transfer', 'car', 'TRAVEL', 6, true, false, false, now(), now()),
  (gen_random_uuid()::text, 'UMRAH', 'Umrah Package', 'umrah', 'sun', 'PILGRIMAGE', 7, true, false, true, now(), now()),
  (gen_random_uuid()::text, 'HAJJ', 'Hajj Package', 'hajj', 'star', 'PILGRIMAGE', 8, true, false, true, now(), now()),
  (gen_random_uuid()::text, 'MEDICAL_TOURISM', 'Medical Tourism', 'medical-tourism', 'heart', 'SPECIALIZED', 9, true, false, true, now(), now()),
  (gen_random_uuid()::text, 'STUDENT_VISA', 'Student Visa', 'student-visa', 'graduation-cap', 'EDUCATION', 10, true, false, true, now(), now()),
  (gen_random_uuid()::text, 'MANPOWER', 'Manpower / Recruitment', 'manpower', 'briefcase', 'SPECIALIZED', 11, true, false, true, now(), now()),
  (gen_random_uuid()::text, 'CRUISE', 'Cruise', 'cruise', 'anchor', 'TRAVEL', 12, true, false, false, now(), now())
ON CONFLICT ("systemCode") DO NOTHING;

CREATE OR REPLACE FUNCTION fn_normalize_service_type_code(p_code TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $fn$
  SELECT CASE upper(replace(trim(p_code), '-', '_'))
    WHEN 'FLIGHT' THEN 'AIR_TICKET'
    WHEN 'AIR' THEN 'AIR_TICKET'
    WHEN 'TICKET' THEN 'AIR_TICKET'
    ELSE upper(replace(trim(p_code), '-', '_'))
  END;
$fn$;

UPDATE "Lead" l
   SET "serviceTypeId" = st."id"
  FROM "ServiceType" st
 WHERE l."serviceTypeId" IS NULL
   AND l."serviceType" IS NOT NULL
   AND st."systemCode" = fn_normalize_service_type_code(l."serviceType");

UPDATE "QuotationLineItem" q
   SET "serviceTypeId" = st."id"
  FROM "ServiceType" st
 WHERE q."serviceTypeId" IS NULL
   AND q."serviceType" IS NOT NULL
   AND st."systemCode" = fn_normalize_service_type_code(q."serviceType");

UPDATE "InvoiceLine" il
   SET "serviceTypeId" = st."id"
  FROM "ServiceType" st
 WHERE il."serviceTypeId" IS NULL
   AND il."serviceType" IS NOT NULL
   AND st."systemCode" = fn_normalize_service_type_code(il."serviceType");

UPDATE "OrderItem" oi
   SET "serviceTypeId" = st."id"
  FROM "ServiceType" st
 WHERE oi."serviceTypeId" IS NULL
   AND oi."serviceType" IS NOT NULL
   AND st."systemCode" = fn_normalize_service_type_code(oi."serviceType");

UPDATE "ServiceItem" si
   SET "serviceTypeId" = st."id"
  FROM "ServiceType" st
 WHERE si."serviceTypeId" IS NULL
   AND si."serviceType" IS NOT NULL
   AND st."systemCode" = fn_normalize_service_type_code(si."serviceType");