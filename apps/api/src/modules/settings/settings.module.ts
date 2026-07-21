import { Module } from '@nestjs/common';
import { SettingsController, CustomFieldsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  controllers: [SettingsController, CustomFieldsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
