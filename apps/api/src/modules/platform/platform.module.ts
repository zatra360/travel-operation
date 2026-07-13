import { Module } from '@nestjs/common';
import { PackageController, SubscriptionController } from './subscription.controller';

@Module({
  controllers: [PackageController, SubscriptionController],
})
export class PlatformModule {}
