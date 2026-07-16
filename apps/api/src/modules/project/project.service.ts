import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProjectDto, UpdateProjectDto, QueryProjectDto, AddProjectMemberDto, UpdateProjectMemberDto, PROJECT_STATUS_TRANSITIONS } from './dto/project.dto';
import { CreateTaskDto, UpdateTaskDto, QueryTaskDto, ReorderTaskDto, CreateChecklistDto, CreateTimeLogDto, UpdateTimeLogDto, AddDependencyDto } from './dto/task.dto';
import { enforceBranchScope } from '../../common/utils/scope';
import { LookupValidationService } from '../master-data/lookup-validation.service';

@Injectable()
export class ProjectService {
  constructor(private readonly prisma: PrismaService, private readonly lookup: LookupValidationService) {}

  // ─── Projects ───────────────────────────────────────────────

  async create(tenantId: string, actorId: string, dto: CreateProjectDto) {
    const projectNumber = `PRJ-${Date.now().toString(36).toUpperCase()}`;
    return this.prisma.project.create({
      data: {
        tenantId,
        projectNumber,
        name: dto.name,
        description: dto.description,
        status: dto.status ?? 'PLANNING',
        priority: dto.priority ?? 'MEDIUM',
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        clientId: dto.clientId,
        assignedToId: dto.assignedToId,
        budget: dto.budget ?? 0,
        currencyCode: dto.currencyCode ?? 'USD',
        notes: dto.notes,
        createdById: actorId,
      },
    });
  }

  async findAll(tenantId: string, query: QueryProjectDto, activeBranchId?: string) {
    const { search, status, page = 1, limit = 50 } = query;
    const where: any = { tenantId, deletedAt: null };
    enforceBranchScope(where, activeBranchId);
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { projectNumber: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        include: {
          assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
          client: { select: { id: true, displayName: true } },
          _count: { select: { tasks: true, members: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.project.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(tenantId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
        client: { select: { id: true, displayName: true, email: true } },
        members: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
        _count: { select: { tasks: true, timeLogs: true } },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async update(tenantId: string, id: string, dto: UpdateProjectDto) {
    const current = await this.findById(tenantId, id);
    if (dto.status !== undefined && dto.status !== current.status) {
      const allowed = PROJECT_STATUS_TRANSITIONS[current.status] ?? [];
      if (!allowed.includes(dto.status)) {
        throw new BadRequestException(
          `Cannot transition from "${current.status}" to "${dto.status}". Allowed: ${allowed.join(', ') || 'none'}`,
        );
      }
    }
    return this.prisma.project.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.startDate !== undefined && { startDate: dto.startDate ? new Date(dto.startDate) : null }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
        ...(dto.clientId !== undefined && { clientId: dto.clientId }),
        ...(dto.assignedToId !== undefined && { assignedToId: dto.assignedToId }),
        ...(dto.budget !== undefined && { budget: dto.budget }),
        ...(dto.currencyCode !== undefined && { currencyCode: dto.currencyCode }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { success: true };
  }

  // ─── Project Members ────────────────────────────────────────

  async addMember(tenantId: string, projectId: string, dto: AddProjectMemberDto) {
    await this.findById(tenantId, projectId);
    return this.prisma.projectMember.create({
      data: {
        tenantId,
        projectId,
        userId: dto.userId,
        role: dto.role ?? 'MEMBER',
        hourlyRate: dto.hourlyRate ?? null,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  async updateMember(tenantId: string, memberId: string, dto: UpdateProjectMemberDto) {
    const member = await this.prisma.projectMember.findFirst({
      where: { id: memberId, tenantId },
    });
    if (!member) throw new NotFoundException('Project member not found');
    return this.prisma.projectMember.update({
      where: { id: memberId },
      data: {
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.hourlyRate !== undefined && { hourlyRate: dto.hourlyRate }),
      },
    });
  }

  async removeMember(tenantId: string, memberId: string) {
    const member = await this.prisma.projectMember.findFirst({
      where: { id: memberId, tenantId },
    });
    if (!member) throw new NotFoundException('Project member not found');
    await this.prisma.projectMember.delete({ where: { id: memberId } });
    return { success: true };
  }

  // ─── Tasks ──────────────────────────────────────────────────

  async createTask(tenantId: string, projectId: string, actorId: string, dto: CreateTaskDto) {
    await this.findById(tenantId, projectId);
    await this.lookup.validateMultiple(tenantId, [
      { categoryCode: 'task-status', code: dto.status },
      { categoryCode: 'task-priority', code: dto.priority },
    ].filter((v) => v.code));
    const maxOrder = await this.prisma.task.aggregate({
      where: { projectId, status: dto.status ?? 'TODO' },
      _max: { kanbanOrder: true },
    });
    const kanbanOrder = dto.kanbanOrder ?? ((maxOrder._max.kanbanOrder ?? -1) + 1);
    return this.prisma.task.create({
      data: {
        tenantId,
        projectId,
        title: dto.title,
        description: dto.description,
        status: dto.status ?? 'TODO',
        priority: dto.priority ?? 'MEDIUM',
        kanbanOrder,
        isMilestone: dto.isMilestone ?? false,
        estimatedHours: dto.estimatedHours ?? null,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        assignedToId: dto.assignedToId,
        parentTaskId: dto.parentTaskId,
        createdById: actorId,
      },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
        checklists: true,
      },
    });
  }

  async findTasks(tenantId: string, projectId: string, query: QueryTaskDto) {
    await this.findById(tenantId, projectId);
    const { search, status, assignedToId, page = 1, limit = 50 } = query;
    const where: any = { tenantId, projectId, deletedAt: null };
    if (status) where.status = status;
    if (assignedToId) where.assignedToId = assignedToId;
    if (search) {
      where.OR = [{ title: { contains: search, mode: 'insensitive' } }];
    }
    const [data, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        include: {
          assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
          checklists: { orderBy: { sortOrder: 'asc' } },
          _count: { select: { subTasks: true, timeLogs: true } },
          dependencies: {
            include: { dependsOn: { select: { id: true, title: true, status: true, startDate: true, dueDate: true, isMilestone: true } } },
          },
        },
        orderBy: [{ kanbanOrder: 'asc' }, { createdAt: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.task.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findTaskById(tenantId: string, projectId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, projectId, tenantId, deletedAt: null },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
        checklists: { orderBy: { sortOrder: 'asc' } },
        subTasks: { where: { deletedAt: null }, include: { assignedTo: { select: { id: true, firstName: true, lastName: true } } } },
        timeLogs: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
        dependencies: {
          include: { dependsOn: { select: { id: true, title: true, status: true, startDate: true, dueDate: true, isMilestone: true } } },
        },
      },
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async updateTask(tenantId: string, projectId: string, taskId: string, dto: UpdateTaskDto) {
    await this.findTaskById(tenantId, projectId, taskId);
    await this.lookup.validateMultiple(tenantId, [
      { categoryCode: 'task-status', code: dto.status },
      { categoryCode: 'task-priority', code: dto.priority },
    ].filter((v) => v.code));
    return this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.kanbanOrder !== undefined && { kanbanOrder: dto.kanbanOrder }),
        ...(dto.isMilestone !== undefined && { isMilestone: dto.isMilestone }),
        ...(dto.estimatedHours !== undefined && { estimatedHours: dto.estimatedHours }),
        ...(dto.startDate !== undefined && { startDate: dto.startDate ? new Date(dto.startDate) : null }),
        ...(dto.dueDate !== undefined && { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }),
        ...(dto.assignedToId !== undefined && { assignedToId: dto.assignedToId }),
        ...(dto.parentTaskId !== undefined && { parentTaskId: dto.parentTaskId }),
      },
    });
  }

  async reorderTask(tenantId: string, projectId: string, dto: ReorderTaskDto) {
    const task = await this.prisma.task.findFirst({
      where: { id: dto.taskId, projectId, tenantId, deletedAt: null },
    });
    if (!task) throw new NotFoundException('Task not found');
    return this.prisma.task.update({
      where: { id: dto.taskId },
      data: { status: dto.status, kanbanOrder: dto.kanbanOrder },
    });
  }

  async removeTask(tenantId: string, projectId: string, taskId: string) {
    await this.findTaskById(tenantId, projectId, taskId);
    await this.prisma.task.update({
      where: { id: taskId },
      data: { deletedAt: new Date() },
    });
    return { success: true };
  }

  // ─── Task Dependencies ──────────────────────────────────────

  async addDependency(tenantId: string, projectId: string, taskId: string, dto: AddDependencyDto) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, projectId, tenantId, deletedAt: null },
    });
    if (!task) throw new NotFoundException('Task not found');

    if (dto.dependsOnTaskId === taskId) throw new BadRequestException('A task cannot depend on itself');

    const dependsOn = await this.prisma.task.findFirst({
      where: { id: dto.dependsOnTaskId, projectId, tenantId, deletedAt: null },
    });
    if (!dependsOn) throw new NotFoundException('Dependency task not found');

    return this.prisma.taskDependency.create({
      data: {
        tenantId,
        taskId,
        dependsOnTaskId: dto.dependsOnTaskId,
      },
      include: {
        dependsOn: { select: { id: true, title: true, status: true, startDate: true, dueDate: true } },
      },
    });
  }

  async findDependencies(tenantId: string, projectId: string, taskId: string) {
    return this.prisma.taskDependency.findMany({
      where: { taskId, tenantId },
      include: {
        dependsOn: { select: { id: true, title: true, status: true, startDate: true, dueDate: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async removeDependency(tenantId: string, projectId: string, taskId: string, depId: string) {
    const dep = await this.prisma.taskDependency.findFirst({
      where: { id: depId, taskId, tenantId },
    });
    if (!dep) throw new NotFoundException('Dependency not found');
    await this.prisma.taskDependency.delete({ where: { id: depId } });
    return { success: true };
  }

  // ─── User-scoped tasks ──────────────────────────────────────

  async findMyTasks(tenantId: string, userId: string, query: QueryTaskDto) {
    const { search, status, page = 1, limit = 50 } = query;
    const where: any = { tenantId, assignedToId: userId, deletedAt: null };
    if (status) where.status = status;
    if (search) where.title = { contains: search, mode: 'insensitive' };
    const [data, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        include: {
          project: { select: { id: true, name: true, projectNumber: true } },
          checklists: { orderBy: { sortOrder: 'asc' } },
          dependencies: {
            include: { dependsOn: { select: { id: true, title: true, status: true, startDate: true, dueDate: true, isMilestone: true } } },
          },
        },
        orderBy: [{ status: 'asc' }, { kanbanOrder: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.task.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ─── Task Checklists ────────────────────────────────────────

  async addChecklist(tenantId: string, projectId: string, taskId: string, dto: CreateChecklistDto) {
    await this.findTaskById(tenantId, projectId, taskId);
    const maxSort = await this.prisma.taskChecklist.aggregate({
      where: { taskId },
      _max: { sortOrder: true },
    });
    return this.prisma.taskChecklist.create({
      data: {
        tenantId,
        taskId,
        title: dto.title,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
    });
  }

  async toggleChecklist(tenantId: string, projectId: string, taskId: string, checklistId: string, userId: string) {
    await this.findTaskById(tenantId, projectId, taskId);
    const item = await this.prisma.taskChecklist.findFirst({
      where: { id: checklistId, taskId, tenantId },
    });
    if (!item) throw new NotFoundException('Checklist item not found');
    return this.prisma.taskChecklist.update({
      where: { id: checklistId },
      data: {
        isCompleted: !item.isCompleted,
        completedById: !item.isCompleted ? userId : null,
        completedAt: !item.isCompleted ? new Date() : null,
      },
    });
  }

  async removeChecklist(tenantId: string, projectId: string, taskId: string, checklistId: string) {
    await this.findTaskById(tenantId, projectId, taskId);
    const item = await this.prisma.taskChecklist.findFirst({
      where: { id: checklistId, taskId, tenantId },
    });
    if (!item) throw new NotFoundException('Checklist item not found');
    await this.prisma.taskChecklist.delete({ where: { id: checklistId } });
    return { success: true };
  }

  // ─── Actual Cost ────────────────────────────────────────────

  private async recalculateActualCost(tenantId: string, projectId: string) {
    const timeLogs = await this.prisma.projectTimeLog.findMany({
      where: { tenantId, projectId, billable: true },
      select: { duration: true, hourlyRate: true },
    });
    const totalCost = timeLogs.reduce((sum, log) => {
      if (log.hourlyRate) {
        return sum + (log.duration / 60) * Number(log.hourlyRate);
      }
      return sum;
    }, 0);
    await this.prisma.project.update({
      where: { id: projectId },
      data: { actualCost: totalCost },
    });
  }

  // ─── Time Logs ──────────────────────────────────────────────

  async createTimeLog(tenantId: string, projectId: string, actorId: string, dto: CreateTimeLogDto) {
    await this.findById(tenantId, projectId);
    const log = await this.prisma.projectTimeLog.create({
      data: {
        tenantId,
        projectId,
        taskId: dto.taskId ?? null,
        userId: dto.userId,
        description: dto.description,
        startTime: dto.startTime ? new Date(dto.startTime) : null,
        endTime: dto.endTime ? new Date(dto.endTime) : null,
        duration: dto.duration,
        billable: dto.billable ?? true,
        hourlyRate: dto.hourlyRate ?? null,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        task: { select: { id: true, title: true } },
      },
    });
    await this.recalculateActualCost(tenantId, projectId);
    return log;
  }

  async findTimeLogs(tenantId: string, projectId: string, page = 1, limit = 50) {
    await this.findById(tenantId, projectId);
    const where = { tenantId, projectId };
    const [data, total] = await Promise.all([
      this.prisma.projectTimeLog.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
          task: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.projectTimeLog.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateTimeLog(tenantId: string, projectId: string, logId: string, dto: UpdateTimeLogDto) {
    const log = await this.prisma.projectTimeLog.findFirst({
      where: { id: logId, projectId, tenantId },
    });
    if (!log) throw new NotFoundException('Time log not found');
    const updated = await this.prisma.projectTimeLog.update({
      where: { id: logId },
      data: {
        ...(dto.taskId !== undefined && { taskId: dto.taskId }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.startTime !== undefined && { startTime: dto.startTime ? new Date(dto.startTime) : null }),
        ...(dto.endTime !== undefined && { endTime: dto.endTime ? new Date(dto.endTime) : null }),
        ...(dto.duration !== undefined && { duration: dto.duration }),
        ...(dto.billable !== undefined && { billable: dto.billable }),
        ...(dto.hourlyRate !== undefined && { hourlyRate: dto.hourlyRate }),
      },
    });
    await this.recalculateActualCost(tenantId, projectId);
    return updated;
  }

  async removeTimeLog(tenantId: string, projectId: string, logId: string) {
    const log = await this.prisma.projectTimeLog.findFirst({
      where: { id: logId, projectId, tenantId },
    });
    if (!log) throw new NotFoundException('Time log not found');
    await this.prisma.projectTimeLog.delete({ where: { id: logId } });
    await this.recalculateActualCost(tenantId, projectId);
    return { success: true };
  }
}
