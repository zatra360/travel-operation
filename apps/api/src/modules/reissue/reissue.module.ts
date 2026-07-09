import { Module } from '@nestjs/common';
import { ReissueController } from './reissue.controller';
import { ReissueService } from './reissue.service';
import { AuditModule } from '../audit/audit.module';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [AuditModule, ActivityModule],
  controllers: [ReissueController],
  providers: [ReissueService],
  exports: [ReissueService],
})
export class ReissueModule {}
