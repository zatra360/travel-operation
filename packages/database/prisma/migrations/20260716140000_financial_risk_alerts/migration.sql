-- CreateTable
CREATE TABLE "FinancialRiskAlert" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "entityType" TEXT,
    "entityId" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialRiskAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinancialRiskAlert_tenantId_status_idx" ON "FinancialRiskAlert"("tenantId", "status");

-- CreateIndex
CREATE INDEX "FinancialRiskAlert_tenantId_alertType_idx" ON "FinancialRiskAlert"("tenantId", "alertType");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialRiskAlert_tenantId_dedupeKey_key" ON "FinancialRiskAlert"("tenantId", "dedupeKey");

