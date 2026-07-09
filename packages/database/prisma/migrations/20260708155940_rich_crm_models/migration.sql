/*
  Warnings:

  - You are about to drop the column `phone` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `Ticket` table. All the data in the column will be lost.
  - You are about to drop the column `voidAt` on the `Ticket` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "holdExpiresAt" TIMESTAMP(3),
ADD COLUMN     "updatedById" TEXT,
ALTER COLUMN "status" SET DEFAULT 'HELD';

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "address" TEXT,
ADD COLUMN     "aiInsights" TEXT,
ADD COLUMN     "alerts" TEXT,
ADD COLUMN     "b2bCreditStatus" TEXT,
ADD COLUMN     "branchName" TEXT,
ADD COLUMN     "cancellationCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "communicationStatus" TEXT,
ADD COLUMN     "companyInfo" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "creditLimit" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "currencyCode" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emergencyPhone" TEXT,
ADD COLUMN     "givenNames" TEXT,
ADD COLUMN     "isVip" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "language" TEXT,
ADD COLUMN     "lastActivityAt" TIMESTAMP(3),
ADD COLUMN     "lastBookingAt" TIMESTAMP(3),
ADD COLUMN     "leadSource" TEXT,
ADD COLUMN     "loyaltyStatus" TEXT,
ADD COLUMN     "nationalId" TEXT,
ADD COLUMN     "nationalityLabel" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "outstandingBalance" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "overdueInvoices" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ownerId" TEXT,
ADD COLUMN     "paymentBehavior" TEXT,
ADD COLUMN     "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "preferredAirlines" TEXT,
ADD COLUMN     "preferredCommunication" TEXT,
ADD COLUMN     "preferredPaymentMethod" TEXT,
ADD COLUMN     "preferredRoutes" TEXT,
ADD COLUMN     "profession" TEXT,
ADD COLUMN     "refundAmountTotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "refundFrequency" TEXT,
ADD COLUMN     "riskScore" INTEGER,
ADD COLUMN     "socialMediaLink" TEXT,
ADD COLUMN     "surname" TEXT,
ADD COLUMN     "timezone" TEXT,
ADD COLUMN     "visaHistoryCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "whatsapp" TEXT,
ADD COLUMN     "whatsappAvailable" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Lead" DROP COLUMN "phone",
ADD COLUMN     "adSet" TEXT,
ADD COLUMN     "agencyName" TEXT,
ADD COLUMN     "agentType" TEXT,
ADD COLUMN     "alternateDateOptions" TEXT,
ADD COLUMN     "alternativeEmail" TEXT,
ADD COLUMN     "approvalPending" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "approvalRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "approxBudget" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "areaRegion" TEXT,
ADD COLUMN     "autoAssignmentTriggered" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autoReminderSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "behavioralPattern" TEXT,
ADD COLUMN     "budgetMax" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "budgetMin" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "cabinTypeId" TEXT,
ADD COLUMN     "campaignName" TEXT,
ADD COLUMN     "checklistProgress" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "commissionCategory" TEXT,
ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "companyType" TEXT,
ADD COLUMN     "confirmedInterest" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "conversionPredictionScore" INTEGER,
ADD COLUMN     "conversionProbability" INTEGER,
ADD COLUMN     "corporateAgreementPotential" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "countryId" TEXT,
ADD COLUMN     "creationMethod" TEXT,
ADD COLUMN     "currencyCode" TEXT,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "decisionMaker" TEXT,
ADD COLUMN     "delayReason" TEXT,
ADD COLUMN     "departureAirportId" TEXT,
ADD COLUMN     "departureCity" TEXT,
ADD COLUMN     "designation" TEXT,
ADD COLUMN     "destinationAirportId" TEXT,
ADD COLUMN     "destinationCity" TEXT,
ADD COLUMN     "destinationInterests" TEXT,
ADD COLUMN     "duplicateScore" INTEGER,
ADD COLUMN     "employeeCount" INTEGER,
ADD COLUMN     "engagementScore" INTEGER,
ADD COLUMN     "escalationStatus" TEXT,
ADD COLUMN     "estimatedCommission" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "estimatedProfit" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "expectedConversionAt" TIMESTAMP(3),
ADD COLUMN     "facebookProfile" TEXT,
ADD COLUMN     "financingRequirement" TEXT,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "firstResponseAt" TIMESTAMP(3),
ADD COLUMN     "flexibleDates" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "followUpCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "fullAddress" TEXT,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "hotelPreference" TEXT,
ADD COLUMN     "hotelStarCategory" TEXT,
ADD COLUMN     "importBatchId" TEXT,
ADD COLUMN     "instagramHandle" TEXT,
ADD COLUMN     "isCorporateLead" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isDomestic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "landingPage" TEXT,
ADD COLUMN     "languagePreference" TEXT,
ADD COLUMN     "lastContactAt" TIMESTAMP(3),
ADD COLUMN     "lastFollowUpOutcome" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "lastQuoteAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "lastQuoteId" TEXT,
ADD COLUMN     "lastQuoteStatus" TEXT,
ADD COLUMN     "leadScore" INTEGER,
ADD COLUMN     "leadTemperature" TEXT,
ADD COLUMN     "linkedinProfile" TEXT,
ADD COLUMN     "maritalStatus" TEXT,
ADD COLUMN     "mealPreference" TEXT,
ADD COLUMN     "nationalityId" TEXT,
ADD COLUMN     "nextFollowUpAt" TIMESTAMP(3),
ADD COLUMN     "numAdults" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "numChildren" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "numInfants" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ownerId" TEXT,
ADD COLUMN     "passengerNotes" TEXT,
ADD COLUMN     "passportNationalityId" TEXT,
ADD COLUMN     "paymentPreference" TEXT,
ADD COLUMN     "paymentReadiness" TEXT,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "potentialRevenue" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "preferredAirlineIds" TEXT,
ADD COLUMN     "preferredContactMethod" TEXT,
ADD COLUMN     "preferredContactTime" TEXT,
ADD COLUMN     "preferredName" TEXT,
ADD COLUMN     "preferredTravelDate" TIMESTAMP(3),
ADD COLUMN     "previousRefusal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "primaryMobile" TEXT,
ADD COLUMN     "profession" TEXT,
ADD COLUMN     "quoteCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "quoteRevisionCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "referralPerson" TEXT,
ADD COLUMN     "referralSource" TEXT,
ADD COLUMN     "repeatCustomerPotential" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "returnDate" TIMESTAMP(3),
ADD COLUMN     "secondaryMobile" TEXT,
ADD COLUMN     "selectedQuoteOption" TEXT,
ADD COLUMN     "slaBreached" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "slaDueAt" TIMESTAMP(3),
ADD COLUMN     "slaStatus" TEXT,
ADD COLUMN     "smartPriority" INTEGER,
ADD COLUMN     "sourcePlatform" TEXT,
ADD COLUMN     "subAgentReference" TEXT,
ADD COLUMN     "teamId" TEXT,
ADD COLUMN     "telegramHandle" TEXT,
ADD COLUMN     "timezoneId" TEXT,
ADD COLUMN     "tourType" TEXT,
ADD COLUMN     "transitPreference" TEXT,
ADD COLUMN     "travelCategory" TEXT,
ADD COLUMN     "travelFrequency" TEXT,
ADD COLUMN     "travelHistoryNotes" TEXT,
ADD COLUMN     "tripType" TEXT,
ADD COLUMN     "urgencyLevel" TEXT,
ADD COLUMN     "urgentVisaProcessing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "utmCampaign" TEXT,
ADD COLUMN     "utmContent" TEXT,
ADD COLUMN     "utmMedium" TEXT,
ADD COLUMN     "utmSource" TEXT,
ADD COLUMN     "viberHandle" TEXT,
ADD COLUMN     "vipPotential" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "visaCountryId" TEXT,
ADD COLUMN     "visaTypeText" TEXT,
ADD COLUMN     "whatsappNumber" TEXT,
ADD COLUMN     "workflowStage" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "idempotencyKey" TEXT;

-- AlterTable
ALTER TABLE "Quotation" ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "assignedBranchId" TEXT,
ADD COLUMN     "billingBranchId" TEXT,
ADD COLUMN     "bookingCreatedAt" TIMESTAMP(3),
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "currentRevision" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "expiredAt" TIMESTAMP(3),
ADD COLUMN     "paymentPendingAt" TIMESTAMP(3),
ADD COLUMN     "paymentReceivedAt" TIMESTAMP(3),
ADD COLUMN     "pnrCreatedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "sentAt" TIMESTAMP(3),
ADD COLUMN     "sourceBranchId" TEXT,
ADD COLUMN     "sourceContextId" TEXT,
ADD COLUMN     "sourceContextRef" TEXT,
ADD COLUMN     "sourceContextType" TEXT,
ADD COLUMN     "ticketIssuedAt" TIMESTAMP(3),
ADD COLUMN     "updatedById" TEXT,
ADD COLUMN     "viewedAt" TIMESTAMP(3),
ADD COLUMN     "visibilityScope" TEXT;

-- AlterTable
ALTER TABLE "Ticket" DROP COLUMN "metadata",
DROP COLUMN "voidAt",
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "passengerId" TEXT,
ADD COLUMN     "refundedAt" TIMESTAMP(3),
ADD COLUMN     "reissuedAt" TIMESTAMP(3),
ADD COLUMN     "voidedAt" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "ClientPassport" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "clientId" TEXT NOT NULL,
    "passportNumber" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "nationality" TEXT,
    "countryCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "hasMrz" BOOLEAN NOT NULL DEFAULT false,
    "hasOcr" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientPassport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientActivity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "clientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientTask" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "clientId" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignedToId" TEXT,
    "dueDate" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationLineItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "serviceType" TEXT,
    "title" TEXT,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "airlineId" TEXT,
    "originAirportId" TEXT,
    "destAirportId" TEXT,
    "routeId" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuotationLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationRevision" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "summary" TEXT,
    "snapshot" JSONB NOT NULL,
    "pdfAssetKey" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuotationRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationStatusLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "note" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuotationStatusLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientPassport_tenantId_idx" ON "ClientPassport"("tenantId");

-- CreateIndex
CREATE INDEX "ClientPassport_clientId_idx" ON "ClientPassport"("clientId");

-- CreateIndex
CREATE INDEX "ClientActivity_tenantId_idx" ON "ClientActivity"("tenantId");

-- CreateIndex
CREATE INDEX "ClientActivity_clientId_idx" ON "ClientActivity"("clientId");

-- CreateIndex
CREATE INDEX "ClientActivity_type_idx" ON "ClientActivity"("type");

-- CreateIndex
CREATE INDEX "ClientTask_tenantId_idx" ON "ClientTask"("tenantId");

-- CreateIndex
CREATE INDEX "ClientTask_clientId_idx" ON "ClientTask"("clientId");

-- CreateIndex
CREATE INDEX "ClientTask_assignedToId_idx" ON "ClientTask"("assignedToId");

-- CreateIndex
CREATE INDEX "ClientTask_status_idx" ON "ClientTask"("status");

-- CreateIndex
CREATE INDEX "QuotationLineItem_tenantId_idx" ON "QuotationLineItem"("tenantId");

-- CreateIndex
CREATE INDEX "QuotationLineItem_quotationId_idx" ON "QuotationLineItem"("quotationId");

-- CreateIndex
CREATE INDEX "QuotationRevision_tenantId_idx" ON "QuotationRevision"("tenantId");

-- CreateIndex
CREATE INDEX "QuotationRevision_quotationId_idx" ON "QuotationRevision"("quotationId");

-- CreateIndex
CREATE INDEX "QuotationStatusLog_tenantId_idx" ON "QuotationStatusLog"("tenantId");

-- CreateIndex
CREATE INDEX "QuotationStatusLog_quotationId_idx" ON "QuotationStatusLog"("quotationId");

-- AddForeignKey
ALTER TABLE "ClientPassport" ADD CONSTRAINT "ClientPassport_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientActivity" ADD CONSTRAINT "ClientActivity_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientTask" ADD CONSTRAINT "ClientTask_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationLineItem" ADD CONSTRAINT "QuotationLineItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationRevision" ADD CONSTRAINT "QuotationRevision_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationStatusLog" ADD CONSTRAINT "QuotationStatusLog_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Leave" ADD CONSTRAINT "Leave_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Leave" ADD CONSTRAINT "Leave_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceReview" ADD CONSTRAINT "PerformanceReview_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceReview" ADD CONSTRAINT "PerformanceReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
