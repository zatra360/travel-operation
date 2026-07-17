import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { RelationshipValidationService } from '../common/services/relationship-validation.service';
import { NumberGeneratorService } from '../common/services/number-generator.service';
import { EmailService } from '../common/services/email.service';
import { AlertService } from '../common/services/alert.service';
import { SearchService } from '../common/services/search.service';
import { SlaService } from '../common/services/sla.service';
import { TotpService } from '../common/services/totp.service';

@Global()
@Module({
  providers: [PrismaService, RelationshipValidationService, NumberGeneratorService, EmailService, AlertService, SearchService, SlaService, TotpService],
  exports: [PrismaService, RelationshipValidationService, NumberGeneratorService, EmailService, AlertService, SearchService, SlaService, TotpService],
})
export class PrismaModule {}
