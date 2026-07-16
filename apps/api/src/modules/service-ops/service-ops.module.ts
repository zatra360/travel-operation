import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ActivityModule } from '../activity/activity.module';
import {
  ServiceTypeController,
  ServiceCaseController,
  ServiceCaseItemController,
  WorkflowApprovalController,
  ServiceDocumentController,
} from './service-ops.controller';
import { ServiceTypeService } from './service-type.service';
import { ServiceCaseService } from './service-case.service';
import { WorkflowEngineService } from './workflow-engine.service';
import { CaseDocumentService } from './case-document.service';

@Module({
  imports: [AuditModule, ActivityModule],
  controllers: [
    ServiceTypeController,
    ServiceCaseController,
    ServiceCaseItemController,
    WorkflowApprovalController,
    ServiceDocumentController,
  ],
  providers: [ServiceTypeService, ServiceCaseService, WorkflowEngineService, CaseDocumentService],
  exports: [ServiceTypeService, ServiceCaseService, WorkflowEngineService, CaseDocumentService],
})
export class ServiceOpsModule {}
