import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { MasterDataModule } from '../master-data/master-data.module';
import { ActivityModule } from '../activity/activity.module';
@Module({ imports: [MasterDataModule, ActivityModule], controllers: [AttendanceController], providers: [AttendanceService], exports: [AttendanceService] })
export class AttendanceModule {}
