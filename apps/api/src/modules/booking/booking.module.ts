import { Module } from '@nestjs/common';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { MasterDataModule } from '../master-data/master-data.module';
import { ActivityModule } from '../activity/activity.module';
import { NotificationModule } from '../notification/notification.module';
import { ClientModule } from '../client/client.module';

@Module({
  imports: [MasterDataModule, ActivityModule, NotificationModule, ClientModule],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}
