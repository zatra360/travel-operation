import { Module } from '@nestjs/common';
import { PackageController, SubscriptionController } from './subscription.controller';
import { PlatformAuditController } from './audit.controller';

@Module({
  controllers: [PackageController, SubscriptionController, PlatformAuditController],
})
export class PlatformModule {}
