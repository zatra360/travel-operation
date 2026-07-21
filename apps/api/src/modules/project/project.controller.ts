import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectService } from './project.service';
import {
  CreateProjectDto, UpdateProjectDto, QueryProjectDto,
  AddProjectMemberDto, UpdateProjectMemberDto,
} from './dto/project.dto';
import {
  CreateTaskDto, UpdateTaskDto, QueryTaskDto, ReorderTaskDto,
  CreateChecklistDto, CreateTimeLogDto, UpdateTimeLogDto, AddDependencyDto,
} from './dto/task.dto';
import { JwtAuthGuard, TenantGuard, PermissionsGuard, RequirePermissions, TenantCtx, TenantContext } from '../../common';

@ApiTags('Tenant - Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('tenant/projects')
export class ProjectController {
  constructor(private readonly service: ProjectService) {}

  // ─── Projects ───────────────────────────────────────────────

  @Post()
  @RequirePermissions('PROJECT_CREATE')
  @ApiOperation({ summary: 'Create a project' })
  create(@TenantCtx() ctx: TenantContext, @Body() dto: CreateProjectDto) {
    return this.service.create(ctx.tenantId, ctx.userId, dto);
  }

  @Get()
  @RequirePermissions('PROJECT_READ')
  @ApiOperation({ summary: 'List projects' })
  findAll(@TenantCtx() ctx: TenantContext, @Query() query: QueryProjectDto) {
    return this.service.findAll(ctx.tenantId, query, ctx.branchId);
  }

  @Get(':id')
  @RequirePermissions('PROJECT_READ')
  @ApiOperation({ summary: 'Get project detail' })
  findById(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.service.findById(ctx.tenantId, id);
  }

  @Put(':id')
  @RequirePermissions('PROJECT_UPDATE')
  @ApiOperation({ summary: 'Update project' })
  update(@TenantCtx() ctx: TenantContext, @Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.service.update(ctx.tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('PROJECT_DELETE')
  @ApiOperation({ summary: 'Soft delete project' })
  remove(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.service.remove(ctx.tenantId, id);
  }

  // ─── Project Members ────────────────────────────────────────

  @Post(':projectId/members')
  @RequirePermissions('PROJECT_UPDATE')
  @ApiOperation({ summary: 'Add project member' })
  addMember(@TenantCtx() ctx: TenantContext, @Param('projectId') projectId: string, @Body() dto: AddProjectMemberDto) {
    return this.service.addMember(ctx.tenantId, projectId, dto);
  }

  @Put('members/:memberId')
  @RequirePermissions('PROJECT_UPDATE')
  @ApiOperation({ summary: 'Update project member' })
  updateMember(@TenantCtx() ctx: TenantContext, @Param('memberId') memberId: string, @Body() dto: UpdateProjectMemberDto) {
    return this.service.updateMember(ctx.tenantId, memberId, dto);
  }

  @Delete('members/:memberId')
  @RequirePermissions('PROJECT_UPDATE')
  @ApiOperation({ summary: 'Remove project member' })
  removeMember(@TenantCtx() ctx: TenantContext, @Param('memberId') memberId: string) {
    return this.service.removeMember(ctx.tenantId, memberId);
  }

  // ─── Tasks ──────────────────────────────────────────────────

  @Post(':projectId/tasks')
  @RequirePermissions('TASK_CREATE')
  @ApiOperation({ summary: 'Create task in project' })
  createTask(@TenantCtx() ctx: TenantContext, @Param('projectId') projectId: string, @Body() dto: CreateTaskDto) {
    return this.service.createTask(ctx.tenantId, projectId, ctx.userId, dto);
  }

  @Get(':projectId/tasks')
  @RequirePermissions('TASK_READ')
  @ApiOperation({ summary: 'List project tasks' })
  findTasks(@TenantCtx() ctx: TenantContext, @Param('projectId') projectId: string, @Query() query: QueryTaskDto) {
    return this.service.findTasks(ctx.tenantId, projectId, query);
  }

  @Get(':projectId/tasks/:taskId')
  @RequirePermissions('TASK_READ')
  @ApiOperation({ summary: 'Get task detail' })
  findTaskById(@TenantCtx() ctx: TenantContext, @Param('projectId') projectId: string, @Param('taskId') taskId: string) {
    return this.service.findTaskById(ctx.tenantId, projectId, taskId);
  }

  @Put(':projectId/tasks/:taskId')
  @RequirePermissions('TASK_UPDATE')
  @ApiOperation({ summary: 'Update task' })
  updateTask(@TenantCtx() ctx: TenantContext, @Param('projectId') projectId: string, @Param('taskId') taskId: string, @Body() dto: UpdateTaskDto) {
    return this.service.updateTask(ctx.tenantId, projectId, taskId, dto);
  }

  @Put(':projectId/tasks/reorder')
  @RequirePermissions('TASK_UPDATE')
  @ApiOperation({ summary: 'Reorder/update task status (Kanban)' })
  reorderTask(@TenantCtx() ctx: TenantContext, @Param('projectId') projectId: string, @Body() dto: ReorderTaskDto) {
    return this.service.reorderTask(ctx.tenantId, projectId, dto);
  }

  @Delete(':projectId/tasks/:taskId')
  @RequirePermissions('TASK_DELETE')
  @ApiOperation({ summary: 'Soft delete task' })
  removeTask(@TenantCtx() ctx: TenantContext, @Param('projectId') projectId: string, @Param('taskId') taskId: string) {
    return this.service.removeTask(ctx.tenantId, projectId, taskId);
  }

  // ─── Task Dependencies ──────────────────────────────────────

  @Get(':projectId/tasks/:taskId/dependencies')
  @RequirePermissions('TASK_READ')
  @ApiOperation({ summary: 'List task dependencies' })
  getDependencies(@TenantCtx() ctx: TenantContext, @Param('projectId') projectId: string, @Param('taskId') taskId: string) {
    return this.service.findDependencies(ctx.tenantId, projectId, taskId);
  }

  @Post(':projectId/tasks/:taskId/dependencies')
  @RequirePermissions('TASK_UPDATE')
  @ApiOperation({ summary: 'Add task dependency' })
  addDependency(@TenantCtx() ctx: TenantContext, @Param('projectId') projectId: string, @Param('taskId') taskId: string, @Body() dto: AddDependencyDto) {
    return this.service.addDependency(ctx.tenantId, projectId, taskId, dto);
  }

  @Delete(':projectId/tasks/:taskId/dependencies/:depId')
  @RequirePermissions('TASK_UPDATE')
  @ApiOperation({ summary: 'Remove task dependency' })
  deleteDependency(@TenantCtx() ctx: TenantContext, @Param('projectId') projectId: string, @Param('taskId') taskId: string, @Param('depId') depId: string) {
    return this.service.removeDependency(ctx.tenantId, projectId, taskId, depId);
  }

  // ─── My Tasks ───────────────────────────────────────────────

  @Get('my/tasks')
  @RequirePermissions('TASK_READ')
  @ApiOperation({ summary: 'Get my assigned tasks across projects' })
  findMyTasks(@TenantCtx() ctx: TenantContext, @Query() query: QueryTaskDto) {
    return this.service.findMyTasks(ctx.tenantId, ctx.userId, query);
  }

  // ─── Task Checklists ────────────────────────────────────────

  @Post(':projectId/tasks/:taskId/checklist')
  @RequirePermissions('TASK_UPDATE')
  @ApiOperation({ summary: 'Add checklist item to task' })
  addChecklist(@TenantCtx() ctx: TenantContext, @Param('projectId') projectId: string, @Param('taskId') taskId: string, @Body() dto: CreateChecklistDto) {
    return this.service.addChecklist(ctx.tenantId, projectId, taskId, dto);
  }

  @Put(':projectId/tasks/:taskId/checklist/:checklistId')
  @RequirePermissions('TASK_UPDATE')
  @ApiOperation({ summary: 'Toggle checklist item' })
  toggleChecklist(@TenantCtx() ctx: TenantContext, @Param('projectId') projectId: string, @Param('taskId') taskId: string, @Param('checklistId') checklistId: string) {
    return this.service.toggleChecklist(ctx.tenantId, projectId, taskId, checklistId, ctx.userId);
  }

  @Delete(':projectId/tasks/:taskId/checklist/:checklistId')
  @RequirePermissions('TASK_UPDATE')
  @ApiOperation({ summary: 'Remove checklist item' })
  removeChecklist(@TenantCtx() ctx: TenantContext, @Param('projectId') projectId: string, @Param('taskId') taskId: string, @Param('checklistId') checklistId: string) {
    return this.service.removeChecklist(ctx.tenantId, projectId, taskId, checklistId);
  }

  // ─── Time Logs ──────────────────────────────────────────────

  @Post(':projectId/time-logs')
  @RequirePermissions('TASK_CREATE')
  @ApiOperation({ summary: 'Add time log entry' })
  createTimeLog(@TenantCtx() ctx: TenantContext, @Param('projectId') projectId: string, @Body() dto: CreateTimeLogDto) {
    return this.service.createTimeLog(ctx.tenantId, projectId, ctx.userId, dto);
  }

  @Get(':projectId/time-logs')
  @RequirePermissions('TASK_READ')
  @ApiOperation({ summary: 'List time logs for project' })
  findTimeLogs(@TenantCtx() ctx: TenantContext, @Param('projectId') projectId: string, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.service.findTimeLogs(ctx.tenantId, projectId, page, limit);
  }

  @Put(':projectId/time-logs/:logId')
  @RequirePermissions('TASK_UPDATE')
  @ApiOperation({ summary: 'Update time log' })
  updateTimeLog(@TenantCtx() ctx: TenantContext, @Param('projectId') projectId: string, @Param('logId') logId: string, @Body() dto: UpdateTimeLogDto) {
    return this.service.updateTimeLog(ctx.tenantId, projectId, logId, dto);
  }

  @Delete(':projectId/time-logs/:logId')
  @RequirePermissions('TASK_UPDATE')
  @ApiOperation({ summary: 'Delete time log' })
  removeTimeLog(@TenantCtx() ctx: TenantContext, @Param('projectId') projectId: string, @Param('logId') logId: string) {
    return this.service.removeTimeLog(ctx.tenantId, projectId, logId);
  }
}
