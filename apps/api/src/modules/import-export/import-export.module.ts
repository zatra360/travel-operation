import { Module } from '@nestjs/common';
import { ImportExportController } from './import-export.controller';
import { ImportService } from '../../common/services/import.service';

@Module({
  controllers: [ImportExportController],
  providers: [ImportService],
})
export class ImportExportModule {}
