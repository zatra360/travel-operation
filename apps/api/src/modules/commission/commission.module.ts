import { Module } from '@nestjs/common';
import { CommissionController } from './commission.controller';
import { CommissionService } from './commission.service';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [ActivityModule],
  controllers: [CommissionController],
  providers: [CommissionService],
  exports: [CommissionService],
})
export class CommissionModule {}
