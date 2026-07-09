import { Module } from '@nestjs/common';
import { SalaryRunController } from './salary-run.controller';
import { SalaryRunService } from './salary-run.service';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [ActivityModule],
  controllers: [SalaryRunController],
  providers: [SalaryRunService],
  exports: [SalaryRunService],
})
export class SalaryRunModule {}
