import { Module } from '@nestjs/common';
import { MasterDataReferenceController, PlatformMasterDataController, TenantMasterDataController } from './master-data.controller';
import { MasterDataService } from './master-data.service';
@Module({ controllers: [MasterDataReferenceController, PlatformMasterDataController, TenantMasterDataController], providers: [MasterDataService], exports: [MasterDataService] })
export class MasterDataModule {}
