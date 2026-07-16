-- CreateTable
CREATE TABLE "ServiceType" (
    "id" TEXT NOT NULL,
    "systemCode" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "category" TEXT NOT NULL DEFAULT 'TRAVEL',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "supportsLead" BOOLEAN NOT NULL DEFAULT true,
    "supportsQuotation" BOOLEAN NOT NULL DEFAULT true,
    "supportsBooking" BOOLEAN NOT NULL DEFAULT true,
    "supportsApplication" BOOLEAN NOT NULL DEFAULT false,
    "supportsTicketing" BOOLEAN NOT NULL DEFAULT false,
    "supportsSupplier" BOOLEAN NOT NULL DEFAULT true,
    "supportsInvoice" BOOLEAN NOT NULL DEFAULT true,
    "supportsPayment" BOOLEAN NOT NULL DEFAULT true,
    "supportsAfterSales" BOOLEAN NOT NULL DEFAULT true,
    "defaultCurrencyCode" TEXT,
    "configuration" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantServiceTypeConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "serviceTypeId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "displayName" TEXT,
    "icon" TEXT,
    "displayOrder" INTEGER,
    "defaultBranchId" TEXT,
    "defaultTeamId" TEXT,
    "defaultAssigneeId" TEXT,
    "defaultWorkflowTemplateId" TEXT,
    "configuration" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantServiceTypeConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "leaderId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCase" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "caseNumber" TEXT NOT NULL,
    "leadId" TEXT,
    "clientId" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "assignedToId" TEXT,
    "ownerId" TEXT,
    "teamId" TEXT,
    "source" TEXT,
    "expectedRevenue" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "closureReason" TEXT,
    "reopenedAt" TIMESTAMP(3),
    "reopenReason" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ServiceCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCaseItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "serviceCaseId" TEXT NOT NULL,
    "serviceTypeId" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "workflowInstanceId" TEXT,
    "currentStageCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "assignedToId" TEXT,
    "ownerId" TEXT,
    "teamId" TEXT,
    "supplierId" TEXT,
    "quotationId" TEXT,
    "bookingId" TEXT,
    "startDate" TIMESTAMP(3),
    "targetCompletionDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "serviceAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "supplierCost" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "grossProfit" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "slaDueAt" TIMESTAMP(3),
    "slaStatus" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ServiceCaseItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "serviceTypeId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowStageTemplate" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL,
    "stageGroup" TEXT NOT NULL DEFAULT 'PROCESSING',
    "responsibleRole" TEXT,
    "slaHours" INTEGER,
    "isInitial" BOOLEAN NOT NULL DEFAULT false,
    "isTerminal" BOOLEAN NOT NULL DEFAULT false,
    "requiredDocumentTypes" JSONB,
    "requiredChecklist" JSONB,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "requiresPayment" BOOLEAN NOT NULL DEFAULT false,
    "allowedNextStageCodes" JSONB,
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowStageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowInstance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "templateVersion" INTEGER NOT NULL DEFAULT 1,
    "currentStageCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "metadata" JSONB DEFAULT '{}',

    CONSTRAINT "WorkflowInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowStageInstance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workflowInstanceId" TEXT NOT NULL,
    "stageCode" TEXT NOT NULL,
    "stageName" TEXT NOT NULL,
    "stageGroup" TEXT NOT NULL DEFAULT 'PROCESSING',
    "sequence" INTEGER NOT NULL,
    "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "slaDueAt" TIMESTAMP(3),
    "slaStatus" TEXT,
    "enteredById" TEXT,

    CONSTRAINT "WorkflowStageInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowStatusHistory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workflowInstanceId" TEXT NOT NULL,
    "fromStageCode" TEXT,
    "toStageCode" TEXT NOT NULL,
    "action" TEXT NOT NULL DEFAULT 'TRANSITION',
    "reason" TEXT,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowChecklistItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workflowInstanceId" TEXT NOT NULL,
    "stageCode" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedById" TEXT,
    "completedAt" TIMESTAMP(3),
    "evidence" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowTask" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workflowInstanceId" TEXT,
    "serviceCaseItemId" TEXT,
    "stageCode" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "assignedToId" TEXT,
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "completedById" TEXT,
    "evidence" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowApproval" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workflowInstanceId" TEXT NOT NULL,
    "stageCode" TEXT NOT NULL,
    "approvalType" TEXT NOT NULL DEFAULT 'STAGE',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedById" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "note" TEXT,

    CONSTRAINT "WorkflowApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseDocument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "serviceCaseId" TEXT,
    "serviceCaseItemId" TEXT,
    "documentType" TEXT NOT NULL,
    "title" TEXT,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "documentId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "accessClassification" TEXT NOT NULL DEFAULT 'STANDARD',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "correctionInstructions" TEXT,
    "requestedById" TEXT,
    "uploadedById" TEXT,
    "verifiedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentAccessLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "caseDocumentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceType_systemCode_key" ON "ServiceType"("systemCode");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceType_slug_key" ON "ServiceType"("slug");

-- CreateIndex
CREATE INDEX "TenantServiceTypeConfig_tenantId_isEnabled_idx" ON "TenantServiceTypeConfig"("tenantId", "isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "TenantServiceTypeConfig_tenantId_serviceTypeId_key" ON "TenantServiceTypeConfig"("tenantId", "serviceTypeId");

-- CreateIndex
CREATE INDEX "Team_tenantId_isActive_idx" ON "Team"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Team_tenantId_code_key" ON "Team"("tenantId", "code");

-- CreateIndex
CREATE INDEX "TeamMember_userId_idx" ON "TeamMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_teamId_userId_key" ON "TeamMember"("teamId", "userId");

-- CreateIndex
CREATE INDEX "ServiceCase_tenantId_status_idx" ON "ServiceCase"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ServiceCase_tenantId_assignedToId_idx" ON "ServiceCase"("tenantId", "assignedToId");

-- CreateIndex
CREATE INDEX "ServiceCase_tenantId_clientId_idx" ON "ServiceCase"("tenantId", "clientId");

-- CreateIndex
CREATE INDEX "ServiceCase_tenantId_leadId_idx" ON "ServiceCase"("tenantId", "leadId");

-- CreateIndex
CREATE INDEX "ServiceCase_tenantId_createdAt_idx" ON "ServiceCase"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCase_tenantId_caseNumber_key" ON "ServiceCase"("tenantId", "caseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCaseItem_workflowInstanceId_key" ON "ServiceCaseItem"("workflowInstanceId");

-- CreateIndex
CREATE INDEX "ServiceCaseItem_tenantId_serviceTypeId_status_idx" ON "ServiceCaseItem"("tenantId", "serviceTypeId", "status");

-- CreateIndex
CREATE INDEX "ServiceCaseItem_tenantId_assignedToId_idx" ON "ServiceCaseItem"("tenantId", "assignedToId");

-- CreateIndex
CREATE INDEX "ServiceCaseItem_tenantId_currentStageCode_idx" ON "ServiceCaseItem"("tenantId", "currentStageCode");

-- CreateIndex
CREATE INDEX "ServiceCaseItem_tenantId_slaDueAt_idx" ON "ServiceCaseItem"("tenantId", "slaDueAt");

-- CreateIndex
CREATE INDEX "ServiceCaseItem_serviceCaseId_idx" ON "ServiceCaseItem"("serviceCaseId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCaseItem_tenantId_referenceNumber_key" ON "ServiceCaseItem"("tenantId", "referenceNumber");

-- CreateIndex
CREATE INDEX "WorkflowTemplate_serviceTypeId_status_idx" ON "WorkflowTemplate"("serviceTypeId", "status");

-- CreateIndex
CREATE INDEX "WorkflowTemplate_tenantId_idx" ON "WorkflowTemplate"("tenantId");

-- CreateIndex
CREATE INDEX "WorkflowStageTemplate_templateId_displayOrder_idx" ON "WorkflowStageTemplate"("templateId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowStageTemplate_templateId_code_key" ON "WorkflowStageTemplate"("templateId", "code");

-- CreateIndex
CREATE INDEX "WorkflowInstance_tenantId_status_idx" ON "WorkflowInstance"("tenantId", "status");

-- CreateIndex
CREATE INDEX "WorkflowInstance_templateId_idx" ON "WorkflowInstance"("templateId");

-- CreateIndex
CREATE INDEX "WorkflowStageInstance_workflowInstanceId_sequence_idx" ON "WorkflowStageInstance"("workflowInstanceId", "sequence");

-- CreateIndex
CREATE INDEX "WorkflowStageInstance_tenantId_slaDueAt_idx" ON "WorkflowStageInstance"("tenantId", "slaDueAt");

-- CreateIndex
CREATE INDEX "WorkflowStatusHistory_workflowInstanceId_createdAt_idx" ON "WorkflowStatusHistory"("workflowInstanceId", "createdAt");

-- CreateIndex
CREATE INDEX "WorkflowStatusHistory_tenantId_createdAt_idx" ON "WorkflowStatusHistory"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "WorkflowChecklistItem_workflowInstanceId_isCompleted_idx" ON "WorkflowChecklistItem"("workflowInstanceId", "isCompleted");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowChecklistItem_workflowInstanceId_stageCode_code_key" ON "WorkflowChecklistItem"("workflowInstanceId", "stageCode", "code");

-- CreateIndex
CREATE INDEX "WorkflowTask_tenantId_status_idx" ON "WorkflowTask"("tenantId", "status");

-- CreateIndex
CREATE INDEX "WorkflowTask_tenantId_assignedToId_status_idx" ON "WorkflowTask"("tenantId", "assignedToId", "status");

-- CreateIndex
CREATE INDEX "WorkflowTask_workflowInstanceId_idx" ON "WorkflowTask"("workflowInstanceId");

-- CreateIndex
CREATE INDEX "WorkflowApproval_workflowInstanceId_stageCode_status_idx" ON "WorkflowApproval"("workflowInstanceId", "stageCode", "status");

-- CreateIndex
CREATE INDEX "WorkflowApproval_tenantId_status_idx" ON "WorkflowApproval"("tenantId", "status");

-- CreateIndex
CREATE INDEX "CaseDocument_serviceCaseItemId_status_idx" ON "CaseDocument"("serviceCaseItemId", "status");

-- CreateIndex
CREATE INDEX "CaseDocument_tenantId_documentType_idx" ON "CaseDocument"("tenantId", "documentType");

-- CreateIndex
CREATE INDEX "DocumentAccessLog_caseDocumentId_createdAt_idx" ON "DocumentAccessLog"("caseDocumentId", "createdAt");

-- CreateIndex
CREATE INDEX "DocumentAccessLog_tenantId_userId_idx" ON "DocumentAccessLog"("tenantId", "userId");

-- AddForeignKey
ALTER TABLE "TenantServiceTypeConfig" ADD CONSTRAINT "TenantServiceTypeConfig_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "ServiceType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCase" ADD CONSTRAINT "ServiceCase_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCaseItem" ADD CONSTRAINT "ServiceCaseItem_serviceCaseId_fkey" FOREIGN KEY ("serviceCaseId") REFERENCES "ServiceCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCaseItem" ADD CONSTRAINT "ServiceCaseItem_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "ServiceType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCaseItem" ADD CONSTRAINT "ServiceCaseItem_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCaseItem" ADD CONSTRAINT "ServiceCaseItem_workflowInstanceId_fkey" FOREIGN KEY ("workflowInstanceId") REFERENCES "WorkflowInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowTemplate" ADD CONSTRAINT "WorkflowTemplate_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "ServiceType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStageTemplate" ADD CONSTRAINT "WorkflowStageTemplate_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WorkflowTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowInstance" ADD CONSTRAINT "WorkflowInstance_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WorkflowTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStageInstance" ADD CONSTRAINT "WorkflowStageInstance_workflowInstanceId_fkey" FOREIGN KEY ("workflowInstanceId") REFERENCES "WorkflowInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStatusHistory" ADD CONSTRAINT "WorkflowStatusHistory_workflowInstanceId_fkey" FOREIGN KEY ("workflowInstanceId") REFERENCES "WorkflowInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowChecklistItem" ADD CONSTRAINT "WorkflowChecklistItem_workflowInstanceId_fkey" FOREIGN KEY ("workflowInstanceId") REFERENCES "WorkflowInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowTask" ADD CONSTRAINT "WorkflowTask_workflowInstanceId_fkey" FOREIGN KEY ("workflowInstanceId") REFERENCES "WorkflowInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowApproval" ADD CONSTRAINT "WorkflowApproval_workflowInstanceId_fkey" FOREIGN KEY ("workflowInstanceId") REFERENCES "WorkflowInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseDocument" ADD CONSTRAINT "CaseDocument_serviceCaseItemId_fkey" FOREIGN KEY ("serviceCaseItemId") REFERENCES "ServiceCaseItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAccessLog" ADD CONSTRAINT "DocumentAccessLog_caseDocumentId_fkey" FOREIGN KEY ("caseDocumentId") REFERENCES "CaseDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

