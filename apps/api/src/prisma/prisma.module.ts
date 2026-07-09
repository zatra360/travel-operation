import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { RelationshipValidationService } from '../common/services/relationship-validation.service';
import { NumberGeneratorService } from '../common/services/number-generator.service';

@Global()
@Module({
  providers: [PrismaService, RelationshipValidationService, NumberGeneratorService],
  exports: [PrismaService, RelationshipValidationService, NumberGeneratorService],
})
export class PrismaModule {}
