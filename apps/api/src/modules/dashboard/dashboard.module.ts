import { Module } from '@nestjs/common';
import { DashboardController, PlatformDashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  controllers: [DashboardController, PlatformDashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
