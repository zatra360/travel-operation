import { Module } from '@nestjs/common';
import { RefundController } from './refund.controller';
import { RefundService } from './refund.service';
import { AuditModule } from '../audit/audit.module';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [AuditModule, ActivityModule],
  controllers: [RefundController],
  providers: [RefundService],
  exports: [RefundService],
})
export class RefundModule {}
