import { Module } from '@nestjs/common';
import { ClientController } from './client.controller';
import { ClientService } from './client.service';
import { ClientScoringService } from './client-scoring.service';
import { ActivityModule } from '../activity/activity.module';
import { MasterDataModule } from '../master-data/master-data.module';

@Module({
  imports: [ActivityModule, MasterDataModule],
  controllers: [ClientController],
  providers: [ClientService, ClientScoringService],
  exports: [ClientService, ClientScoringService],
})
export class ClientModule {}
