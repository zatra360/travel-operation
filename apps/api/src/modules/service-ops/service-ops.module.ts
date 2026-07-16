import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ActivityModule } from '../activity/activity.module';
import { NotificationModule } from '../notification/notification.module';
import {
  ServiceTypeController,
  ServiceCaseController,
  ServiceCaseItemController,
  WorkflowApprovalController,
  ServiceDocumentController,
  ServiceReportController,
  TeamController,
  WorkflowTemplateController,
} from './service-ops.controller';
import { ServiceTypeService } from './service-type.service';
import { ServiceCaseService } from './service-case.service';
import { WorkflowEngineService } from './workflow-engine.service';
import { CaseDocumentService } from './case-document.service';
import { ServiceReportsService } from './service-reports.service';
import { WorkflowAutomationService } from './workflow-automation.service';
import { AutomationSchedulerService } from './automation-scheduler.service';
import { TeamService } from './team.service';
import { WorkflowTemplateService } from './workflow-template.service';

@Module({
  imports: [AuditModule, ActivityModule, NotificationModule],
  controllers: [
    ServiceTypeController,
    ServiceCaseController,
    ServiceCaseItemController,
    WorkflowApprovalController,
    ServiceDocumentController,
    ServiceReportController,
    TeamController,
    WorkflowTemplateController,
  ],
  providers: [ServiceTypeService, ServiceCaseService, WorkflowEngineService, CaseDocumentService, ServiceReportsService, WorkflowAutomationService, AutomationSchedulerService, TeamService, WorkflowTemplateService],
  exports: [ServiceTypeService, ServiceCaseService, WorkflowEngineService, CaseDocumentService, ServiceReportsService, WorkflowAutomationService, AutomationSchedulerService, TeamService, WorkflowTemplateService],
})
export class ServiceOpsModule {}
