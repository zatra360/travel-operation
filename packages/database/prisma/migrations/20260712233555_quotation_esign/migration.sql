ALTER TABLE "Quotation" ADD COLUMN "publicHash" TEXT;
ALTER TABLE "Quotation" ADD COLUMN "signatureRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Quotation" ADD COLUMN "clientComment" TEXT;
ALTER TABLE "Quotation" ADD COLUMN "lastViewedAt" TIMESTAMP(3);
ALTER TABLE "Quotation" ADD COLUMN "sendStatus" TEXT NOT NULL DEFAULT 'NOT_SENT';
CREATE UNIQUE INDEX "Quotation_publicHash_key" ON "Quotation"("publicHash");
CREATE TABLE "QuotationSign" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "signature" TEXT,
    "ipAddress" TEXT,
    "consentGiven" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuotationSign_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "QuotationSign_quotationId_key" ON "QuotationSign"("quotationId");
ALTER TABLE "QuotationSign" ADD CONSTRAINT "QuotationSign_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
