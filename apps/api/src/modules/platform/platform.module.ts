import { Module } from '@nestjs/common';
import { PackageController, SubscriptionController } from './subscription.controller';
import { TenantSubscriptionController } from './tenant-subscription.controller';
import { PlatformAuditController } from './audit.controller';
import { PlatformLoginHistoryController } from './login-history.controller';
import { PlatformUserSecurityController } from './user-security.controller';

@Module({
  controllers: [
    PackageController,
    SubscriptionController,
    TenantSubscriptionController,
    PlatformAuditController,
    PlatformLoginHistoryController,
    PlatformUserSecurityController,
  ],
})
export class PlatformModule {}
