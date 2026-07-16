import { Module } from '@nestjs/common';
import { PackageController, SubscriptionController } from './subscription.controller';
import { PlatformAuditController } from './audit.controller';
import { PlatformLoginHistoryController } from './login-history.controller';
import { PlatformUserSecurityController } from './user-security.controller';

@Module({
  controllers: [
    PackageController,
    SubscriptionController,
    PlatformAuditController,
    PlatformLoginHistoryController,
    PlatformUserSecurityController,
  ],
})
export class PlatformModule {}
