import { Module } from '@nestjs/common';
import { PassportController, PassportListController } from './passport.controller';
import { PassportService } from './passport.service';

@Module({
  controllers: [PassportController, PassportListController],
  providers: [PassportService],
  exports: [PassportService],
})
export class PassportModule {}
