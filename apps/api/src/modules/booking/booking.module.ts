import { Module } from '@nestjs/common';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { MasterDataModule } from '../master-data/master-data.module';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [MasterDataModule, ActivityModule],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}
