import { Module } from '@nestjs/common';
import { MasterDataReferenceController, PlatformMasterDataController, TenantMasterDataController, PlatformReferenceDataController } from './master-data.controller';
import { MasterDataService } from './master-data.service';
import { LookupValidationService } from './lookup-validation.service';
@Module({ controllers: [MasterDataReferenceController, PlatformMasterDataController, TenantMasterDataController, PlatformReferenceDataController], providers: [MasterDataService, LookupValidationService], exports: [MasterDataService, LookupValidationService] })
export class MasterDataModule {}
