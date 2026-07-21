'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { StatusBadge } from '@/components/ui/status-badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { useTimerStore } from '@/stores/timer-store';
import { formatDate, formatMoney } from '@/lib/utils';
import {
  Project, TaskItem, TimeLogEntry, Paginated, ProjectMember,
  TASK_STATUSES, TASK_PRIORITIES, PROJECT_STATUS_TRANSITIONS,
} from '@/lib/crm';
import { TimeLogDialog, type TimeLogFormData } from './time-log-dialog';
import { MemberDialog } from './member-dialog';
import {
  Plus, Pencil, Trash2, Clock, CheckSquare,
  GripVertical, BarChart3, Play, Square, UserPlus, Settings2, Gem, GitMerge,
} from 'lucide-react';

const KANBAN_COLUMNS = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] as const;

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { activeTenant, user } = useAuthStore();
  const store = useTimerStore();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [timeLogs, setTimeLogs] = useState<TimeLogEntry[]>([]);
  const [removing, setRemoving] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<ProjectMember | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskStatus, setTaskStatus] = useState('TODO');
  const [taskPriority, setTaskPriority] = useState('MEDIUM');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskDue, setTaskDue] = useState('');
  const [taskMilestone, setTaskMilestone] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [timeLogDialogOpen, setTimeLogDialogOpen] = useState(false);
  const [savingTimeLog, setSavingTimeLog] = useState(false);
  const [editingTimeLog, setEditingTimeLog] = useState<TimeLogEntry | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeTimerTaskId = store.activeTimer?.taskId ?? null;

  useEffect(() => {
    if (store.activeTimer) {
      const startMs = new Date(store.activeTimer.startTime).getTime();
      const update = () => setElapsed(Math.floor((Date.now() - startMs) / 1000));
      update();
      timerRef.current = setInterval(update, 1000);
    } else {
      setElapsed(0);
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [store.activeTimer]);

  const formatElapsed = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const load = useCallback(async () => {
    if (!activeTenant || !params.id) return;
    setLoading(true);
    setError('');
    try {
      const [p, t, tl] = await Promise.all([
        api.get<Project>(`/api/v1/tenant/projects/${params.id}`, { tenantId: activeTenant.id }),
        api.get<Paginated<TaskItem>>(`/api/v1/tenant/projects/${params.id}/tasks?limit=200`, { tenantId: activeTenant.id }),
        api.get<Paginated<TimeLogEntry>>(`/api/v1/tenant/projects/${params.id}/time-logs?limit=50`, { tenantId: activeTenant.id }),
      ]);
      setProject(p);
      setTasks(t.data);
      setTimeLogs(tl.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [activeTenant, params.id]);

  useEffect(() => { load(); }, [load]);

  const totalTime = timeLogs.reduce((sum, l) => sum + l.duration, 0);

  const startTimer = (taskId: string, taskTitle: string) => {
    if (!params.id) return;
    store.startTimer(taskId, params.id as string, taskTitle);
    toast.success(`Timer started for "${taskTitle}"`);
  };

  const stopTimer = async () => {
    const timer = store.stopTimer();
    if (!timer || !activeTenant || !user || !params.id) return;
    const durationMin = Math.max(1, Math.round(elapsed / 60));
    setSavingTimeLog(true);
    try {
      await api.post(`/api/v1/tenant/projects/${params.id}/time-logs`, {
        taskId: timer.taskId,
        userId: user.id,
        duration: durationMin,
        startTime: timer.startTime,
        endTime: new Date().toISOString(),
        description: `Timed: ${timer.taskTitle}`,
        billable: true,
      }, { tenantId: activeTenant.id });
      toast.success(`Logged ${durationMin}m for "${timer.taskTitle}"`);
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save time log');
    } finally {
      setSavingTimeLog(false);
    }
  };

  const saveTimeLog = async (data: TimeLogFormData) => {
    if (!activeTenant || !user || !params.id) return;
    setSavingTimeLog(true);
    try {
      const body = {
        taskId: data.taskId,
        ...(editingTimeLog ? {} : { userId: user.id }),
        duration: data.hours * 60 + data.minutes,
        description: data.description || undefined,
        billable: data.billable,
        hourlyRate: data.hourlyRate > 0 ? data.hourlyRate : undefined,
      };
      if (editingTimeLog) {
        await api.put(`/api/v1/tenant/projects/${params.id}/time-logs/${editingTimeLog.id}`, body, { tenantId: activeTenant.id });
        toast.success('Time log updated');
      } else {
        await api.post(`/api/v1/tenant/projects/${params.id}/time-logs`, body, { tenantId: activeTenant.id });
        toast.success('Time logged');
      }
      setTimeLogDialogOpen(false);
      setEditingTimeLog(null);
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save time log');
    } finally {
      setSavingTimeLog(false);
    }
  };

  const deleteTimeLog = async (logId: string) => {
    if (!activeTenant || !params.id) return;
    try {
      await api.delete(`/api/v1/tenant/projects/${params.id}/time-logs/${logId}`, { tenantId: activeTenant.id });
      toast.success('Time log deleted');
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete time log');
    }
  };

  const openAddMember = () => {
    setEditingMember(null);
    setMemberDialogOpen(true);
  };

  const openEditMember = (m: ProjectMember) => {
    setEditingMember(m);
    setMemberDialogOpen(true);
  };

  const confirmRemoveMember = (memberId: string) => {
    const member = project?.members?.find((m) => m.id === memberId);
    const name = member ? `${member.user.firstName} ${member.user.lastName}` : 'this member';
    setRemoving({ id: memberId, name });
  };

  const removeMember = async () => {
    if (!activeTenant || !params.id || !removing) return;
    api.delete(`/api/v1/tenant/projects/members/${removing.id}`, { tenantId: activeTenant.id })
      .then(() => { toast.success(`${removing.name} removed`); setRemoving(null); load(); })
      .catch((err: any) => toast.error(err.message || 'Failed to remove member'));
  };

  const changeStatus = async (newStatus: string) => {
    if (!activeTenant || !params.id) return;
    try {
      await api.put(`/api/v1/tenant/projects/${params.id}`, { status: newStatus }, { tenantId: activeTenant.id });
      toast.success(`Status changed to ${newStatus.replace(/_/g, ' ')}`);
      load();
    } catch (err: any) { toast.error(err.message || 'Failed to change status'); }
  };

  const openCreateTask = () => {
    setEditingTask(null); setTaskTitle(''); setTaskDesc(''); setTaskStatus('TODO');
    setTaskPriority('MEDIUM'); setTaskAssignee(''); setTaskDue(''); setTaskMilestone(false);
    setTaskDialogOpen(true);
  };

  const openEditTask = (t: TaskItem) => {
    setEditingTask(t); setTaskTitle(t.title); setTaskDesc(t.description ?? '');
    setTaskStatus(t.status); setTaskPriority(t.priority);
    setTaskAssignee(t.assignedToId ?? ''); setTaskDue(t.dueDate ? t.dueDate.slice(0, 10) : '');
    setTaskMilestone(t.isMilestone ?? false);
    setTaskDialogOpen(true);
  };

  const saveTask = async () => {
    if (!activeTenant || !params.id || !taskTitle.trim()) return;
    setSavingTask(true);
    try {
      const body: any = {
        title: taskTitle.trim(),
        description: taskDesc.trim() || undefined,
        status: taskStatus,
        priority: taskPriority,
        isMilestone: taskMilestone,
        assignedToId: taskAssignee || undefined,
        dueDate: taskDue ? new Date(taskDue).toISOString() : undefined,
      };
      if (editingTask) {
        await api.put(`/api/v1/tenant/projects/${params.id}/tasks/${editingTask.id}`, body, { tenantId: activeTenant.id });
        toast.success('Task updated');
      } else {
        await api.post(`/api/v1/tenant/projects/${params.id}/tasks`, body, { tenantId: activeTenant.id });
        toast.success('Task created');
      }
      setTaskDialogOpen(false);
      load();
    } catch (err: any) { toast.error(err.message || 'Failed to save task'); }
    finally { setSavingTask(false); }
  };

  const deleteTask = async (taskId: string) => {
    if (!activeTenant || !params.id) return;
    try {
      await api.delete(`/api/v1/tenant/projects/${params.id}/tasks/${taskId}`, { tenantId: activeTenant.id });
      toast.success('Task deleted');
      load();
    } catch (err: any) { toast.error(err.message || 'Failed to delete task'); }
  };

  const dragTask = async (taskId: string, newStatus: string, newOrder: number) => {
    if (!activeTenant || !params.id) return;
    try {
      await api.put(`/api/v1/tenant/projects/${params.id}/tasks/reorder`, { taskId, status: newStatus, kanbanOrder: newOrder }, { tenantId: activeTenant.id });
      load();
    } catch { /* ignore */ }
  };

  const toggleChecklist = async (taskId: string, checklistId: string) => {
    if (!activeTenant || !params.id) return;
    try {
      await api.put(`/api/v1/tenant/projects/${params.id}/tasks/${taskId}/checklist/${checklistId}`, {}, { tenantId: activeTenant.id });
      load();
    } catch { /* ignore */ }
  };

  const addChecklist = async (taskId: string) => {
    const title = prompt('Checklist item title:');
    if (!title || !activeTenant || !params.id) return;
    try {
      await api.post(`/api/v1/tenant/projects/${params.id}/tasks/${taskId}/checklist`, { title }, { tenantId: activeTenant.id });
      toast.success('Checklist item added');
      load();
    } catch (err: any) { toast.error(err.message || 'Failed to add checklist item'); }
  };

  const tasksByStatus = (status: string) =>
    tasks.filter((t) => t.status === status).sort((a, b) => a.kanbanOrder - b.kanbanOrder);

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-64" />)}
        </div>
      </div>
    );
  }

  if (error) return <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>;
  if (!project) return <div className="text-muted-foreground">Project not found</div>;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Projects', href: '/projects' }, { label: project.name }]} />
      <PageHeader
        title={project.name}
        subtitle={
          <div className="flex items-center gap-3 flex-wrap">
            <StatusBadge status={project.status} />
            {(PROJECT_STATUS_TRANSITIONS[project.status]?.length ?? 0) > 0 && (
              <Select value="" onValueChange={(v) => { if (v) changeStatus(v); }}>
                <SelectTrigger className="h-7 w-auto px-2 gap-1 text-xs border-dashed">
                  <SelectValue placeholder="Change…" />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUS_TRANSITIONS[project.status]?.map((s) => (
                    <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <StatusBadge status={project.priority} kind="priority" />
            <span className="text-sm text-muted-foreground">{project.projectNumber}</span>
            {project.assignedTo && <span className="text-sm text-muted-foreground">Manager: {project.assignedTo.firstName} {project.assignedTo.lastName}</span>}
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/projects/${params.id}/board`}>
              <Button variant="outline" size="sm"><GripVertical className="mr-2 h-4 w-4" />Kanban</Button>
            </Link>
            <Link href={`/projects/${params.id}/gantt`}>
              <Button variant="outline" size="sm"><BarChart3 className="mr-2 h-4 w-4" />Gantt</Button>
            </Link>
            <Button size="sm" onClick={openCreateTask}><Plus className="mr-2 h-4 w-4" />Add Task</Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatMoney(project.budget, project.currencyCode)}</p>
            <div className="mt-3 space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Spent: {formatMoney(project.actualCost, project.currencyCode)}</span>
                <span>{Number(project.budget) > 0 ? Math.round((Number(project.actualCost) / Number(project.budget)) * 100) : 0}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(Number(project.budget) > 0 ? (Number(project.actualCost) / Number(project.budget)) * 100 : 0, 100)}%`,
                    backgroundColor: Number(project.budget) > 0 && Number(project.actualCost) / Number(project.budget) > 0.9 ? 'hsl(var(--destructive))' : Number(project.actualCost) / Number(project.budget) > 0.75 ? 'hsl(var(--warning))' : 'hsl(var(--primary))',
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Remaining: {formatMoney(Math.max(Number(project.budget) - Number(project.actualCost), 0), project.currencyCode)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Tasks</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{tasks.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Members</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{project.members?.length ?? 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Time Logged</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{Math.floor(totalTime / 60)}h {totalTime % 60}m</p></CardContent></Card>
      </div>

      {project.description && (
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground whitespace-pre-wrap">{project.description}</p></CardContent></Card>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Team Members</h3>
            <Badge variant="secondary" className="text-xs">{project.members?.length ?? 0}</Badge>
          </div>
          <Button size="sm" variant="outline" onClick={openAddMember}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />Add Member
          </Button>
        </div>
        {(!project.members || project.members.length === 0) && (
          <div className="text-xs text-muted-foreground text-center py-8 border-2 border-dashed border-muted rounded-md">
            No members assigned
          </div>
        )}
        {project.members && project.members.length > 0 && (
          <div className="border rounded-lg divide-y">
            {project.members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/10 transition-colors">
                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                  {m.user.firstName[0]}{m.user.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{m.user.firstName} {m.user.lastName}</span>
                    <StatusBadge status={m.role} />
                  </div>
                  <div className="text-xs text-muted-foreground">{m.user.email}</div>
                </div>
                {m.hourlyRate != null && (
                  <div className="text-xs text-muted-foreground shrink-0">
                    ${Number(m.hourlyRate).toFixed(2)}/hr
                  </div>
                )}
                <button onClick={() => openEditMember(m)} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                  <Settings2 className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => confirmRemoveMember(m.id)} className="shrink-0 text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 min-h-[400px]">
        {KANBAN_COLUMNS.map((col) => (
          <div key={col} className="bg-muted/30 rounded-lg p-3 space-y-3"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const taskId = e.dataTransfer.getData('taskId');
              if (taskId) dragTask(taskId, col, tasksByStatus(col).length);
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                {col.replace(/_/g, ' ')}
                <Badge variant="secondary" className="text-xs">{tasksByStatus(col).length}</Badge>
              </h3>
            </div>
            {tasksByStatus(col).length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-6 border-2 border-dashed border-muted rounded-md">
                No tasks
              </div>
            )}
            {tasksByStatus(col).map((task) => (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('taskId', task.id)}
                className="bg-card rounded-lg border p-3 space-y-2 cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium leading-tight">
                    {task.isMilestone && <Gem className="h-3 w-3 inline-block text-primary mr-1 align-[-1px]" />}
                    {task.title}
                  </p>
                  <button onClick={() => deleteTask(task.id)} className="shrink-0 opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status={task.priority} kind="priority" />
                  {task.dueDate && <span className="text-xs text-muted-foreground">{formatDate(task.dueDate)}</span>}
                  {task.assignedTo && (
                    <span className="text-xs text-muted-foreground truncate">
                      {task.assignedTo.firstName} {task.assignedTo.lastName}
                    </span>
                  )}
                </div>
                {task.checklists && task.checklists.length > 0 && (
                  <div className="space-y-1">
                    {task.checklists.slice(0, 3).map((cl) => (
                      <label key={cl.id} className="flex items-center gap-2 text-xs cursor-pointer" onClick={() => toggleChecklist(task.id, cl.id)}>
                        <input type="checkbox" checked={cl.isCompleted} readOnly className="h-3 w-3 accent-primary" />
                        <span className={cl.isCompleted ? 'line-through text-muted-foreground' : ''}>{cl.title}</span>
                      </label>
                    ))}
                    {task.checklists.length > 3 && <p className="text-xs text-muted-foreground">+{task.checklists.length - 3} more</p>}
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                  <button onClick={() => openEditTask(task)} className="hover:text-foreground"><Pencil className="h-3 w-3" /></button>
                  <button onClick={() => addChecklist(task.id)} className="hover:text-foreground"><CheckSquare className="h-3 w-3" /></button>
                  {task._count?.timeLogs ? <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{task._count.timeLogs}</span> : null}
                  {task.dependencies && task.dependencies.length > 0 ? <span className="flex items-center gap-1"><GitMerge className="h-3 w-3" />{task.dependencies.length}</span> : null}
                  {activeTimerTaskId === task.id ? (
                    <button onClick={stopTimer} className="hover:text-destructive ml-auto flex items-center gap-1 text-destructive font-semibold" title="Stop timer">
                      <Square className="h-3 w-3 fill-current" />
                      {formatElapsed(elapsed)}
                    </button>
                  ) : (
                    <button
                      onClick={() => startTimer(task.id, task.title)}
                      className="hover:text-primary ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                      title={activeTimerTaskId ? 'Timer running for another task' : 'Start timer'}
                    >
                      <Play className="h-3 w-3 fill-current" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <Separator />

      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Time Logs</h3>
            <Badge variant="secondary" className="text-xs">{timeLogs.length}</Badge>
          </div>
          <Button size="sm" variant="outline" onClick={() => setTimeLogDialogOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />Log Time
          </Button>
        </div>
        {timeLogs.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-8 border-2 border-dashed border-muted rounded-md">
            No time logged yet
          </div>
        )}
        {timeLogs.length > 0 && (
          <div className="border rounded-lg divide-y">
            {timeLogs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/10 transition-colors">
                <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold shrink-0">
                  {log.user ? `${log.user.firstName[0]}${log.user.lastName[0]}` : '??'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {log.task && <span className="text-xs font-medium truncate">{log.task.title}</span>}
                    {log.description && <span className="text-xs text-muted-foreground truncate">— {log.description}</span>}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    {log.user && <span>{log.user.firstName} {log.user.lastName}</span>}
                    {log.createdAt && <span>{formatDate(log.createdAt)}</span>}
                    {!log.billable && <Badge variant="secondary" className="text-[9px] px-1">Non-billable</Badge>}
                  </div>
                </div>
                <div className="text-xs font-semibold tabular-nums shrink-0">
                  {Math.floor(log.duration / 60)}h {log.duration % 60}m
                </div>
                <button onClick={() => { setEditingTimeLog(log); setTimeLogDialogOpen(true); }} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                  <Pencil className="h-3 w-3" />
                </button>
                <button onClick={() => deleteTimeLog(log.id)} className="shrink-0 text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <TaskDialog
        open={taskDialogOpen} onOpenChange={setTaskDialogOpen}
        editing={editingTask} title={taskTitle} onTitleChange={setTaskTitle}
        desc={taskDesc} onDescChange={setTaskDesc}
        status={taskStatus} onStatusChange={setTaskStatus}
        priority={taskPriority} onPriorityChange={setTaskPriority}
        assignee={taskAssignee} onAssigneeChange={setTaskAssignee}
        due={taskDue} onDueChange={setTaskDue}
        onSave={saveTask} saving={savingTask}
        milestone={taskMilestone} onMilestoneChange={setTaskMilestone}
      />

      <TimeLogDialog
        open={timeLogDialogOpen}
        onOpenChange={(open) => { setTimeLogDialogOpen(open); if (!open) setEditingTimeLog(null); }}
        tasks={tasks}
        onSave={saveTimeLog}
        saving={savingTimeLog}
        editingLog={editingTimeLog}
      />

      <MemberDialog
        open={memberDialogOpen}
        onOpenChange={setMemberDialogOpen}
        projectId={params.id as string}
        editing={editingMember}
        onSaved={load}
      />

      <ConfirmDialog open={!!removing} onOpenChange={o => !o && setRemoving(null)} title="Remove member?" description={`Remove ${removing?.name} from the project?`} confirmLabel="Remove" destructive onConfirm={removeMember} />
    </div>
  );
}

function TaskDialog({
  open, onOpenChange, editing, title, onTitleChange,
  desc, onDescChange, status, onStatusChange, priority, onPriorityChange,
  assignee, onAssigneeChange, due, onDueChange, onSave, saving,
  milestone, onMilestoneChange,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; editing: TaskItem | null;
  title: string; onTitleChange: (v: string) => void;
  desc: string; onDescChange: (v: string) => void;
  status: string; onStatusChange: (v: string) => void;
  priority: string; onPriorityChange: (v: string) => void;
  assignee: string; onAssigneeChange: (v: string) => void;
  due: string; onDueChange: (v: string) => void;
  onSave: () => void; saving: boolean;
  milestone: boolean; onMilestoneChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Task' : 'New Task'}</DialogTitle>
          <DialogDescription>Add or update a task for this project</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title *</Label>
            <Input value={title} onChange={(e) => onTitleChange(e.target.value)} placeholder="Task title" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</Label>
              <Select value={status} onValueChange={onStatusChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TASK_STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Priority</Label>
              <Select value={priority} onValueChange={onPriorityChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TASK_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="taskMilestone"
              checked={milestone}
              onChange={(e) => onMilestoneChange(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            <Label htmlFor="taskMilestone" className="cursor-pointer">Mark as milestone</Label>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Due Date</Label>
            <Input type="date" value={due} onChange={(e) => onDueChange(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</Label>
            <Textarea value={desc} onChange={(e) => onDescChange(e.target.value)} rows={3} placeholder="Task description" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave} disabled={saving}>{saving ? 'Saving…' : editing ? 'Update' : 'Create'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
