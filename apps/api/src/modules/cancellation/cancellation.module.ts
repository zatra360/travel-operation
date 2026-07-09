import { Module } from '@nestjs/common';
import { CancellationController } from './cancellation.controller';
import { CancellationService } from './cancellation.service';
import { AuditModule } from '../audit/audit.module';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [AuditModule, ActivityModule],
  controllers: [CancellationController],
  providers: [CancellationService],
  exports: [CancellationService],
})
export class CancellationModule {}
