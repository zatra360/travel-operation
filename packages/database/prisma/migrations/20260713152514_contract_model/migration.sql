CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "clientId" TEXT NOT NULL,
    "quotationId" TEXT,
    "contractNumber" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "contractType" TEXT NOT NULL DEFAULT 'SERVICE_AGREEMENT',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "amount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "description" TEXT,
    "terms" TEXT,
    "publicHash" TEXT,
    "signedAt" TIMESTAMP(3),
    "signedByName" TEXT,
    "signedByEmail" TEXT,
    "signature" TEXT,
    "signatureIp" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Contract_tenantId_contractNumber_key" ON "Contract"("tenantId","contractNumber");
CREATE UNIQUE INDEX "Contract_publicHash_key" ON "Contract"("publicHash");
CREATE INDEX "Contract_tenantId_idx" ON "Contract"("tenantId");
CREATE INDEX "Contract_clientId_idx" ON "Contract"("clientId");
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
