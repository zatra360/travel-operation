import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { AuditModule } from '../audit/audit.module';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [AuditModule, ActivityModule],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
