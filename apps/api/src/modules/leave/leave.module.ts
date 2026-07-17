import { Module } from '@nestjs/common';
import { LeaveController } from './leave.controller';
import { LeaveService } from './leave.service';
import { MasterDataModule } from '../master-data/master-data.module';
import { NotificationModule } from '../notification/notification.module';
@Module({ imports: [MasterDataModule, NotificationModule], controllers: [LeaveController], providers: [LeaveService], exports: [LeaveService] })
export class LeaveModule {}
