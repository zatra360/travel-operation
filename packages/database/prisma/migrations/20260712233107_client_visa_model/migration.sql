ALTER TABLE "ClientPassport" ADD COLUMN "issueDate" TIMESTAMP(3);
ALTER TABLE "ClientPassport" ADD COLUMN "documentId" TEXT;
CREATE TABLE "ClientVisa" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "clientId" TEXT NOT NULL,
    "visaNumber" TEXT,
    "visaType" TEXT,
    "countryId" TEXT,
    "passportId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "entryType" TEXT,
    "durationDays" INTEGER,
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "applicationDate" TIMESTAMP(3),
    "approvalDate" TIMESTAMP(3),
    "documentId" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientVisa_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ClientVisa_tenantId_idx" ON "ClientVisa"("tenantId");
CREATE INDEX "ClientVisa_clientId_idx" ON "ClientVisa"("clientId");
CREATE INDEX "ClientVisa_passportId_idx" ON "ClientVisa"("passportId");
ALTER TABLE "ClientVisa" ADD CONSTRAINT "ClientVisa_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientVisa" ADD CONSTRAINT "ClientVisa_passportId_fkey" FOREIGN KEY ("passportId") REFERENCES "ClientPassport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClientVisa" ADD CONSTRAINT "ClientVisa_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;
