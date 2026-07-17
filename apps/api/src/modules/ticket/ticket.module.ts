import { Module } from '@nestjs/common';
import { TicketController } from './ticket.controller';
import { TicketService } from './ticket.service';
import { ActivityModule } from '../activity/activity.module';
import { MasterDataModule } from '../master-data/master-data.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [ActivityModule, MasterDataModule, NotificationModule],
  controllers: [TicketController],
  providers: [TicketService],
  exports: [TicketService],
})
export class TicketModule {}
