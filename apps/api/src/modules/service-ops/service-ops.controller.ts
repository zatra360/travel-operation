import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, TenantGuard, PermissionsGuard, RequirePermissions, TenantCtx, TenantContext } from '../../common';
import { ServiceTypeService } from './service-type.service';
import { ServiceCaseService } from './service-case.service';
import { WorkflowEngineService } from './workflow-engine.service';
import { CaseDocumentService } from './case-document.service';
import { ServiceReportsService } from './service-reports.service';
import { WorkflowAutomationService } from './workflow-automation.service';
import { TeamService, TeamDto } from './team.service';
import { ConfigureServiceTypeDto } from './dto/service-type.dto';
import {
  CreateServiceCaseDto, AddServiceItemDto, QueryServiceCaseDto, AssignDto, CloseCaseDto, ReopenCaseDto,
  CancelItemDto, TransitionDto, CompleteChecklistDto, RequestApprovalDto, DecideApprovalDto,
  RequestCaseDocumentDto, TransitionCaseDocumentDto,
} from './dto/service-case.dto';

@ApiTags('Tenant - Service Types')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/service-types')
export class ServiceTypeController {
  constructor(private readonly service: ServiceTypeService) {}

  @Get()
  @RequirePermissions('SERVICE_TYPE_READ')
  @ApiOperation({ summary: 'List service types with the tenant configuration overlay' })
  list(@TenantCtx() ctx: TenantContext, @Query('includeDisabled') includeDisabled?: string) {
    return this.service.listForTenant(ctx.tenantId, includeDisabled === 'true');
  }

  @Put(':systemCode/config')
  @RequirePermissions('SERVICE_TYPE_MANAGE')
  @ApiOperation({ summary: 'Enable/disable and configure a service type for this tenant' })
  configure(@TenantCtx() ctx: TenantContext, @Param('systemCode') systemCode: string, @Body() dto: ConfigureServiceTypeDto) {
    return this.service.configure(ctx.tenantId, ctx.userId, systemCode, dto);
  }
}

@ApiTags('Tenant - Service Cases')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/service-cases')
export class ServiceCaseController {
  constructor(
    private readonly cases: ServiceCaseService,
    private readonly documents: CaseDocumentService,
  ) {}

  @Post()
  @RequirePermissions('SERVICE_CASE_CREATE')
  @ApiOperation({ summary: 'Create an operational case with one or more service items (workflows auto-start)' })
  create(@TenantCtx() ctx: TenantContext, @Body() dto: CreateServiceCaseDto) {
    return this.cases.create(ctx.tenantId, ctx.userId, ctx.branchId, dto);
  }

  @Post('from-lead/:leadId')
  @RequirePermissions('SERVICE_CASE_CREATE')
  @ApiOperation({ summary: 'Convert a lead into an operational case (service item seeded from the lead service type)' })
  createFromLead(@TenantCtx() ctx: TenantContext, @Param('leadId') leadId: string) {
    return this.cases.createFromLead(ctx.tenantId, ctx.userId, ctx.branchId, leadId);
  }

  @Get()
  @RequirePermissions('SERVICE_CASE_READ')
  @ApiOperation({ summary: 'List service cases' })
  findAll(@TenantCtx() ctx: TenantContext, @Query() query: QueryServiceCaseDto) {
    return this.cases.findAll(ctx.tenantId, query, ctx.branchId);
  }

  @Get(':id')
  @RequirePermissions('SERVICE_CASE_READ')
  @ApiOperation({ summary: 'Case detail with items and documents' })
  findById(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.cases.findById(ctx.tenantId, id);
  }

  @Get(':id/timeline')
  @RequirePermissions('SERVICE_CASE_READ')
  @ApiOperation({ summary: 'Combined activity timeline for the case and its items' })
  timeline(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.cases.getCaseTimeline(ctx.tenantId, id);
  }

  @Get(':id/financials')
  @RequirePermissions('SERVICE_CASE_READ')
  @ApiOperation({ summary: 'Per-item and total revenue/cost/profit summary' })
  financials(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.cases.financialSummary(ctx.tenantId, id);
  }

  @Post(':id/items')
  @RequirePermissions('SERVICE_ITEM_CREATE')
  @ApiOperation({ summary: 'Add a service item to an existing case' })
  addItem(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: AddServiceItemDto) {
    return this.cases.addItem(ctx.tenantId, ctx.userId, id, dto);
  }

  @Post(':id/assign')
  @RequirePermissions('SERVICE_CASE_UPDATE')
  @ApiOperation({ summary: 'Assign the case to a user and/or team' })
  assign(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: AssignDto) {
    return this.cases.assign(ctx.tenantId, ctx.userId, id, dto);
  }

  @Post(':id/close')
  @RequirePermissions('SERVICE_CASE_MANAGE')
  @ApiOperation({ summary: 'Close a case (blocked while items are active unless forced with a reason)' })
  close(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: CloseCaseDto) {
    return this.cases.close(ctx.tenantId, ctx.userId, id, dto);
  }

  @Post(':id/reopen')
  @RequirePermissions('SERVICE_CASE_MANAGE')
  @ApiOperation({ summary: 'Reopen a closed case (reason required)' })
  reopen(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: ReopenCaseDto) {
    return this.cases.reopen(ctx.tenantId, ctx.userId, id, dto);
  }
}

@ApiTags('Tenant - Service Case Items & Workflow')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/service-case-items')
export class ServiceCaseItemController {
  constructor(
    private readonly cases: ServiceCaseService,
    private readonly engine: WorkflowEngineService,
    private readonly documents: CaseDocumentService,
  ) {}

  @Get(':id')
  @RequirePermissions('SERVICE_ITEM_READ')
  @ApiOperation({ summary: 'Service item detail' })
  findById(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.cases.getItem(ctx.tenantId, id);
  }

  @Get(':id/workflow')
  @RequirePermissions('SERVICE_ITEM_READ')
  @ApiOperation({ summary: 'Workflow stepper: stages, states, history, checklist, approvals' })
  async workflow(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    const item = await this.cases.getItem(ctx.tenantId, id);
    if (!item.workflowInstanceId) return null;
    return this.engine.getTimeline(ctx.tenantId, item.workflowInstanceId);
  }

  @Get(':id/transitions')
  @RequirePermissions('SERVICE_ITEM_READ')
  @ApiOperation({ summary: 'Available transitions with blocker explanations' })
  async transitions(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    const item = await this.cases.getItem(ctx.tenantId, id);
    if (!item.workflowInstanceId) return null;
    return this.engine.getAvailableTransitions(ctx.tenantId, item.workflowInstanceId);
  }

  @Post(':id/transition')
  @RequirePermissions('SERVICE_ITEM_UPDATE')
  @ApiOperation({ summary: 'Perform a validated workflow transition (server-side gates)' })
  async transition(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: TransitionDto) {
    const item = await this.cases.getItem(ctx.tenantId, id);
    if (!item.workflowInstanceId) throw new Error('Item has no workflow instance');
    return this.engine.transition(ctx.tenantId, ctx.userId, item.workflowInstanceId, dto.toStageCode, dto.reason);
  }

  @Post(':id/checklist/:checklistItemId/complete')
  @RequirePermissions('SERVICE_ITEM_UPDATE')
  @ApiOperation({ summary: 'Complete a checklist item' })
  async completeChecklist(
    @TenantCtx() ctx: TenantContext,
    @Param('id') id: string,
    @Param('checklistItemId') checklistItemId: string,
    @Body() dto: CompleteChecklistDto,
  ) {
    const item = await this.cases.getItem(ctx.tenantId, id);
    return this.engine.completeChecklistItem(ctx.tenantId, ctx.userId, item.workflowInstanceId!, checklistItemId, dto.evidence);
  }

  @Post(':id/approvals/request')
  @RequirePermissions('SERVICE_ITEM_UPDATE')
  @ApiOperation({ summary: 'Request the approval required by the current stage' })
  async requestApproval(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: RequestApprovalDto) {
    const item = await this.cases.getItem(ctx.tenantId, id);
    return this.engine.requestApproval(ctx.tenantId, ctx.userId, item.workflowInstanceId!, dto.note);
  }

  @Post(':id/cancel')
  @RequirePermissions('SERVICE_ITEM_MANAGE')
  @ApiOperation({ summary: 'Cancel a service item (reason required; cancels its workflow)' })
  cancel(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: CancelItemDto) {
    return this.cases.cancelItem(ctx.tenantId, ctx.userId, id, dto.reason);
  }

  @Post(':id/link-quotation/:quotationId')
  @RequirePermissions('SERVICE_ITEM_UPDATE')
  @ApiOperation({ summary: 'Link a quotation to the item; optionally sync financials from matching lines' })
  linkQuotation(
    @TenantCtx() ctx: TenantContext,
    @Param('id') id: string,
    @Param('quotationId') quotationId: string,
    @Query('syncFinancials') syncFinancials?: string,
  ) {
    return this.cases.linkQuotation(ctx.tenantId, ctx.userId, id, quotationId, syncFinancials === 'true');
  }

  @Post(':id/link-booking/:bookingId')
  @RequirePermissions('SERVICE_ITEM_UPDATE')
  @ApiOperation({ summary: 'Link a booking to the item (captures booking ref and hold expiry/TTL)' })
  linkBooking(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Param('bookingId') bookingId: string) {
    return this.cases.linkBooking(ctx.tenantId, ctx.userId, id, bookingId);
  }

  @Get(':id/documents')
  @RequirePermissions('SERVICE_DOCUMENT_READ')
  @ApiOperation({ summary: 'Case documents for this item (sensitive access is logged)' })
  listDocuments(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.documents.listForItem(ctx.tenantId, ctx.userId, id);
  }
}

@ApiTags('Tenant - Workflow Approvals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/workflow-approvals')
export class WorkflowApprovalController {
  constructor(private readonly engine: WorkflowEngineService) {}

  @Post(':id/decide')
  @RequirePermissions('WORKFLOW_APPROVAL_MANAGE')
  @ApiOperation({ summary: 'Approve or reject a pending workflow approval (decider must differ from requester)' })
  decide(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: DecideApprovalDto) {
    return this.engine.decideApproval(ctx.tenantId, ctx.userId, id, dto.decision, dto.note);
  }
}

@ApiTags('Tenant - Service Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/service-reports')
export class ServiceReportController {
  constructor(
    private readonly reports: ServiceReportsService,
    private readonly automation: WorkflowAutomationService,
  ) {}

  @Get('dashboard')
  @RequirePermissions('SERVICE_REPORT_READ')
  @ApiOperation({ summary: 'Per-service operational dashboard: volumes, financials, SLA counts' })
  dashboard(@TenantCtx() ctx: TenantContext) {
    return this.reports.dashboard(ctx.tenantId);
  }

  @Get('sla')
  @RequirePermissions('SERVICE_REPORT_READ')
  @ApiOperation({ summary: 'Breached and at-risk (24h) SLA items with assignees' })
  sla(@TenantCtx() ctx: TenantContext) {
    return this.reports.slaReport(ctx.tenantId);
  }

  @Get('workload')
  @RequirePermissions('SERVICE_REPORT_READ')
  @ApiOperation({ summary: 'Active/overdue item counts per assignee' })
  workload(@TenantCtx() ctx: TenantContext) {
    return this.reports.workloadReport(ctx.tenantId);
  }

  @Get('bottlenecks')
  @RequirePermissions('SERVICE_REPORT_READ')
  @ApiOperation({ summary: 'Slowest workflow stages (avg hours) and current items per stage' })
  bottlenecks(@TenantCtx() ctx: TenantContext) {
    return this.reports.bottlenecks(ctx.tenantId);
  }

  @Post('automation/scan')
  @RequirePermissions('SERVICE_REPORT_MANAGE')
  @ApiOperation({ summary: 'Run SLA breach/warning and TTL scans (idempotent; creates automation tasks + notifications)' })
  scan(@TenantCtx() ctx: TenantContext) {
    return this.automation.runScans(ctx.tenantId, ctx.userId);
  }
}

@ApiTags('Tenant - Teams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/teams')
export class TeamController {
  constructor(private readonly teams: TeamService) {}

  @Get()
  @RequirePermissions('TEAM_READ')
  @ApiOperation({ summary: 'List teams with members, leaders and workload counts' })
  findAll(@TenantCtx() ctx: TenantContext) {
    return this.teams.findAll(ctx.tenantId);
  }

  @Post()
  @RequirePermissions('TEAM_CREATE')
  @ApiOperation({ summary: 'Create a team (leader becomes a member automatically)' })
  create(@TenantCtx() ctx: TenantContext, @Body() dto: TeamDto) {
    return this.teams.create(ctx.tenantId, ctx.userId, dto);
  }

  @Put(':id')
  @RequirePermissions('TEAM_UPDATE')
  @ApiOperation({ summary: 'Update a team' })
  update(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: TeamDto) {
    return this.teams.update(ctx.tenantId, ctx.userId, id, dto);
  }

  @Post(':id/members')
  @RequirePermissions('TEAM_UPDATE')
  @ApiOperation({ summary: 'Add a tenant member to the team' })
  addMember(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() body: { userId: string; role?: string }) {
    return this.teams.addMember(ctx.tenantId, ctx.userId, id, body.userId, body.role);
  }

  @Post(':id/members/:userId/remove')
  @RequirePermissions('TEAM_UPDATE')
  @ApiOperation({ summary: 'Remove a member from the team (leaders must be replaced first)' })
  removeMember(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Param('userId') userId: string) {
    return this.teams.removeMember(ctx.tenantId, ctx.userId, id, userId);
  }
}

@ApiTags('Tenant - Service Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/service-documents')
export class ServiceDocumentController {
  constructor(private readonly documents: CaseDocumentService) {}

  @Post()
  @RequirePermissions('SERVICE_DOCUMENT_CREATE')
  @ApiOperation({ summary: 'Request a document for a service item' })
  request(@TenantCtx() ctx: TenantContext, @Body() dto: RequestCaseDocumentDto) {
    return this.documents.request(ctx.tenantId, ctx.userId, dto);
  }

  @Put(':id/status')
  @RequirePermissions('SERVICE_DOCUMENT_UPDATE')
  @ApiOperation({ summary: 'Move a case document through its lifecycle (received/verify/correction/reject/...)' })
  transition(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: TransitionCaseDocumentDto) {
    return this.documents.transition(ctx.tenantId, ctx.userId, id, dto);
  }

  @Get(':id/access-log')
  @RequirePermissions('SERVICE_DOCUMENT_MANAGE')
  @ApiOperation({ summary: 'Access log for a case document (compliance)' })
  accessLog(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.documents.accessLog(ctx.tenantId, id);
  }
}
