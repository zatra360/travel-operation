import { Module } from '@nestjs/common';
import { MasterDataReferenceController, PlatformMasterDataController, TenantMasterDataController } from './master-data.controller';
import { MasterDataService } from './master-data.service';
import { LookupValidationService } from './lookup-validation.service';
@Module({ controllers: [MasterDataReferenceController, PlatformMasterDataController, TenantMasterDataController], providers: [MasterDataService, LookupValidationService], exports: [MasterDataService, LookupValidationService] })
export class MasterDataModule {}
