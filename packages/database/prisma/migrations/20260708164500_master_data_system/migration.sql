-- CreateTable
CREATE TABLE "MasterDataCategory" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "module" TEXT,
    "scope" TEXT NOT NULL DEFAULT 'GLOBAL',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MasterDataCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterDataItem" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "description" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MasterDataItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantMasterDataOverride" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "masterItemId" TEXT,
    "categoryCode" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "description" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB DEFAULT '{}',
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TenantMasterDataOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MasterDataCategory_code_key" ON "MasterDataCategory"("code");

-- CreateIndex
CREATE INDEX "MasterDataCategory_module_idx" ON "MasterDataCategory"("module");

-- CreateIndex
CREATE INDEX "MasterDataCategory_isActive_idx" ON "MasterDataCategory"("isActive");

-- CreateIndex
CREATE INDEX "MasterDataItem_categoryId_idx" ON "MasterDataItem"("categoryId");

-- CreateIndex
CREATE INDEX "MasterDataItem_isActive_idx" ON "MasterDataItem"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "MasterDataItem_categoryId_code_key" ON "MasterDataItem"("categoryId", "code");

-- CreateIndex
CREATE INDEX "TenantMasterDataOverride_tenantId_idx" ON "TenantMasterDataOverride"("tenantId");

-- CreateIndex
CREATE INDEX "TenantMasterDataOverride_tenantId_categoryCode_idx" ON "TenantMasterDataOverride"("tenantId", "categoryCode");

-- CreateIndex
CREATE INDEX "TenantMasterDataOverride_masterItemId_idx" ON "TenantMasterDataOverride"("masterItemId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantMasterDataOverride_tenantId_branchId_categoryCode_cod_key" ON "TenantMasterDataOverride"("tenantId", "branchId", "categoryCode", "code");

-- AddForeignKey
ALTER TABLE "MasterDataItem" ADD CONSTRAINT "MasterDataItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MasterDataCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantMasterDataOverride" ADD CONSTRAINT "TenantMasterDataOverride_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantMasterDataOverride" ADD CONSTRAINT "TenantMasterDataOverride_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantMasterDataOverride" ADD CONSTRAINT "TenantMasterDataOverride_masterItemId_fkey" FOREIGN KEY ("masterItemId") REFERENCES "MasterDataItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
