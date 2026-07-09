import { Module } from '@nestjs/common';
import { TicketController } from './ticket.controller';
import { TicketService } from './ticket.service';
import { AuditModule } from '../audit/audit.module';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [AuditModule, ActivityModule],
  controllers: [TicketController],
  providers: [TicketService],
  exports: [TicketService],
})
export class TicketModule {}
