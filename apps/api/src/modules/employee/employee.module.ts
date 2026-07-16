import { Module } from '@nestjs/common';
import { EmployeeController } from './employee.controller';
import { EmployeeService } from './employee.service';
import { MasterDataModule } from '../master-data/master-data.module';
@Module({ imports: [MasterDataModule], controllers: [EmployeeController], providers: [EmployeeService], exports: [EmployeeService] })
export class EmployeeModule {}
