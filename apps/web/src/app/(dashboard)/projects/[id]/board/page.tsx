'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/lib/utils';
import { Project, TaskItem, Paginated, TASK_STATUSES, TASK_PRIORITIES } from '@/lib/crm';
import { Plus, Pencil, Trash2, ArrowLeft, CheckSquare, Clock, X } from 'lucide-react';

export default function KanbanBoardPage() {
  const params = useParams();
  const router = useRouter();
  const { activeTenant } = useAuthStore();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeTenant || !params.id) return;
    try {
      const [p, t] = await Promise.all([
        api.get<Project>(`/api/v1/tenant/projects/${params.id}`, { tenantId: activeTenant.id }),
        api.get<Paginated<TaskItem>>(`/api/v1/tenant/projects/${params.id}/tasks?limit=200`, { tenantId: activeTenant.id }),
      ]);
      setProject(p);
      setTasks(t.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [activeTenant, params.id]);

  useEffect(() => { load(); }, [load]);

  const dragTask = async (taskId: string, newStatus: string) => {
    const colTasks = tasks.filter((t) => t.status === newStatus && t.id !== taskId).sort((a, b) => a.kanbanOrder - b.kanbanOrder);
    const newOrder = colTasks.length;
    const oldTasks = [...tasks];
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus, kanbanOrder: newOrder } : t));
    try {
      await api.put(`/api/v1/tenant/projects/${params.id}/tasks/reorder`, { taskId, status: newStatus, kanbanOrder: newOrder }, { tenantId: activeTenant?.id });
    } catch { setTasks(oldTasks); }
  };

  const tasksByStatus = (status: string) =>
    tasks.filter((t) => t.status === status).sort((a, b) => a.kanbanOrder - b.kanbanOrder);

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading board…</div>;
  if (!project) return <div className="text-center py-12 text-muted-foreground">Project not found</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/projects/${params.id}`)}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-lg font-semibold">{project.name}</h1>
            <p className="text-sm text-muted-foreground">{project.projectNumber} · Kanban Board</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><div className="h-2.5 w-2.5 rounded-full bg-secondary" /> TODO: {tasksByStatus('TODO').length}</span>
          <span className="flex items-center gap-1"><div className="h-2.5 w-2.5 rounded-full bg-primary" /> IN PROGRESS: {tasksByStatus('IN_PROGRESS').length}</span>
          <span className="flex items-center gap-1"><div className="h-2.5 w-2.5 rounded-full bg-warning" /> REVIEW: {tasksByStatus('REVIEW').length}</span>
          <span className="flex items-center gap-1"><div className="h-2.5 w-2.5 rounded-full bg-success" /> DONE: {tasksByStatus('DONE').length}</span>
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-4 gap-4" style={{ height: 'calc(100vh - 200px)' }}>
        {TASK_STATUSES.map((col) => (
          <div
            key={col}
            className={`bg-muted/20 rounded-lg p-3 flex flex-col ${dragOverCol === col ? 'ring-2 ring-primary' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOverCol(col); }}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOverCol(null);
              const taskId = e.dataTransfer.getData('taskId');
              if (taskId) dragTask(taskId, col);
            }}
          >
            <div className="flex items-center justify-between mb-3 shrink-0">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                {col === 'TODO' && <div className="h-2.5 w-2.5 rounded-full bg-secondary" />}
                {col === 'IN_PROGRESS' && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                {col === 'REVIEW' && <div className="h-2.5 w-2.5 rounded-full bg-orange-400" />}
                {col === 'DONE' && <div className="h-2.5 w-2.5 rounded-full bg-green-500" />}
                {col.replace(/_/g, ' ')}
              </h3>
              <Badge variant="secondary" className="text-xs">{tasksByStatus(col).length}</Badge>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {tasksByStatus(col).length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-8 border-2 border-dashed border-muted rounded-md">
                  Drop tasks here
                </div>
              )}
              {tasksByStatus(col).map((task) => (
                <KanbanCard key={task.id} task={task} onDelete={async () => {
                  await api.delete(`/api/v1/tenant/projects/${params.id}/tasks/${task.id}`, { tenantId: activeTenant?.id });
                  toast.success('Task deleted');
                  load();
                }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function KanbanCard({ task, onDelete }: { task: TaskItem; onDelete: () => void }) {
  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData('taskId', task.id)}
      className="bg-card rounded-lg border p-3 space-y-2 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow group"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-tight">{task.title}</p>
        <button onClick={onDelete} className="shrink-0 opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity">
          <X className="h-3 w-3" />
        </button>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <StatusBadge status={task.priority} kind="priority" />
        {task.dueDate && <span className="text-xs text-muted-foreground">{formatDate(task.dueDate)}</span>}
      </div>
      {task.assignedTo && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold">
            {task.assignedTo.firstName[0]}{task.assignedTo.lastName[0]}
          </div>
          <span>{task.assignedTo.firstName} {task.assignedTo.lastName}</span>
        </div>
      )}
      {task.checklists && task.checklists.length > 0 && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <CheckSquare className="h-3 w-3" />
          {task.checklists.filter((c) => c.isCompleted).length}/{task.checklists.length}
        </div>
      )}
    </div>
  );
}
