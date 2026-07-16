'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/lib/utils';
import { Project, TaskItem, Paginated } from '@/lib/crm';
import { humanizeStatus } from '@/lib/status';
import { ArrowLeft, Gem, ZoomIn, ZoomOut, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

const ROW_H = 44;
const LEFT_W = 360;

const STATUS_ORDER = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];

const STATUS_COLORS: Record<string, string> = {
  TODO: 'bg-secondary',
  IN_PROGRESS: 'bg-primary',
  REVIEW: 'bg-orange-400',
  DONE: 'bg-green-500',
};

const ZOOM_OPTIONS = ['day', 'week', 'month'] as const;
const DAY_W_MAP: Record<string, number> = { day: 30, week: 14, month: 6 };

function toStartOfDay(d: string | Date): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

interface GanttBar {
  task: TaskItem;
  startDays: number;
  durationDays: number;
  hasDates: boolean;
}

interface DepArrow {
  fromTaskId: string;
  toTaskId: string;
}

export default function GanttPage() {
  const params = useParams();
  const router = useRouter();
  const { activeTenant } = useAuthStore();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState<string>('day');
  const rightRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const scrolledToday = useRef(false);

  const DAY_W = DAY_W_MAP[zoom] ?? 30;

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
  useEffect(() => { scrolledToday.current = false; }, [zoom, tasks]);

  const syncScroll = (source: 'left' | 'right') => {
    const left = leftRef.current;
    const right = rightRef.current;
    if (!left || !right) return;
    if (source === 'left') right.scrollTop = left.scrollTop;
    else left.scrollTop = right.scrollTop;
  };

  const scrollToToday = useCallback(() => {
    const el = rightRef.current;
    if (!el) return;
    const containerWidth = el.clientWidth;
    const scrollTarget = Math.max(0, todayX - containerWidth / 3);
    el.scrollTo({ left: scrollTarget, behavior: 'smooth' });
  }, []);

  const { dateRange, totalDays, bars, todayX, months, weekMarkers, depArrows, weekends } = useMemo(() => {
    const allDates = tasks.flatMap(t => [t.startDate, t.dueDate].filter(Boolean) as string[]);
    if (allDates.length === 0) {
      return { dateRange: { start: new Date(), end: new Date() }, totalDays: 0, bars: [], todayX: 0, months: [], weekMarkers: [], depArrows: [], weekends: [] };
    }

    let min = Math.min(...allDates.map(d => toStartOfDay(d).getTime()));
    let max = Math.max(...allDates.map(d => toStartOfDay(d).getTime()));

    if (project?.startDate) min = Math.min(min, toStartOfDay(project.startDate).getTime());
    if (project?.endDate) max = Math.max(max, toStartOfDay(project.endDate).getTime());

    const start = new Date(min - 7 * 86400000);
    const end = new Date(max + 7 * 86400000);
    const days = Math.ceil((end.getTime() - start.getTime()) / 86400000);

    const today = toStartOfDay(new Date());
    const tx = daysBetween(start, today) * DAY_W;

    const orderedTasks = STATUS_ORDER.flatMap(s =>
      tasks.filter(t => t.status === s).sort((a, b) => a.kanbanOrder - b.kanbanOrder)
    );

    const b = orderedTasks.map(task => {
      const sd = task.startDate ? toStartOfDay(task.startDate) : null;
      const dd = task.dueDate ? toStartOfDay(task.dueDate) : null;
      if (sd && dd) {
        const sDays = daysBetween(start, sd);
        const dur = Math.max(daysBetween(sd, dd) || 1, 1);
        return { task, startDays: sDays, durationDays: dur, hasDates: true };
      }
      if (sd) {
        const sDays = daysBetween(start, sd);
        return { task, startDays: sDays, durationDays: 1, hasDates: true };
      }
      return { task, startDays: 0, durationDays: 0, hasDates: false };
    });

    const m: { label: string; startDay: number; width: number }[] = [];
    let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor < end) {
      const next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      const sDay = Math.max(0, daysBetween(start, cursor));
      const w = daysBetween(cursor, next) * DAY_W;
      m.push({ label: zoom === 'month' ? cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : cursor.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), startDay: sDay, width: w });
      cursor = next;
    }

    const wm: { day: Date; x: number; label: string }[] = [];
    if (zoom === 'month') {
      for (let i = 0; i <= days; i++) {
        const d = new Date(start.getTime() + i * 86400000);
        if (d.getDate() === 1 || i === 0) {
          wm.push({ day: d, x: i * DAY_W, label: d.toLocaleDateString('en-US', { month: 'short' }) });
        }
      }
    } else {
      for (let i = 0; i <= days; i++) {
        const d = new Date(start.getTime() + i * 86400000);
        if (d.getDay() === 1 || i === 0 || daysBetween(d, end) <= 1) {
          wm.push({ day: d, x: i * DAY_W, label: `${d.getDate()}` });
        }
      }
    }

    const wkd: number[] = [];
    for (let i = 0; i <= days; i++) {
      const d = new Date(start.getTime() + i * 86400000);
      if (d.getDay() === 0 || d.getDay() === 6) {
        wkd.push(i);
      }
    }

    const arrows: DepArrow[] = [];
    orderedTasks.forEach(task => {
      if (task.dependencies) {
        task.dependencies.forEach(dep => {
          if (orderedTasks.some(t => t.id === dep.dependsOn.id)) {
            arrows.push({ fromTaskId: dep.dependsOn.id, toTaskId: task.id });
          }
        });
      }
    });

    return { dateRange: { start, end }, totalDays: days, bars: b as GanttBar[], todayX: tx, months: m, weekMarkers: wm, depArrows: arrows, weekends: wkd };
  }, [tasks, project, zoom, DAY_W]);

  useEffect(() => {
    if (!loading && todayX > 0 && todayX < totalDays * DAY_W && !scrolledToday.current) {
      scrolledToday.current = true;
      const timer = setTimeout(() => scrollToToday(), 100);
      return () => clearTimeout(timer);
    }
  }, [loading, todayX, totalDays, DAY_W, scrollToToday]);

  if (loading) return (
    <div className="space-y-5">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
  if (!project) return <div className="text-muted-foreground">Project not found</div>;

  const allBars = bars;
  const totalWidth = totalDays * DAY_W;

  const groupedRows: ({ type: 'header'; label: string; count: number } | { type: 'task'; bar: GanttBar })[] = [];
  let rowIndex = 0;
  const rowMap: Record<string, number> = {};
  const rowY: Record<string, number> = {};

  STATUS_ORDER.forEach(status => {
    const statusBars = allBars.filter(b => b.task.status === status);
    if (statusBars.length === 0) return;
    groupedRows.push({ type: 'header' as const, label: humanizeStatus(status), count: statusBars.length });
    rowIndex++;
    statusBars.forEach(b => {
      groupedRows.push({ type: 'task' as const, bar: b } as any);
      rowMap[b.task.id] = rowIndex;
      rowY[b.task.id] = 40 + rowIndex * ROW_H + ROW_H / 2;
      rowIndex++;
    });
  });

  if (groupedRows.length === 0) {
    return (
      <div className="space-y-4">
        <Breadcrumb items={[{ label: 'Projects', href: '/projects' }, { label: project.name, href: `/projects/${params.id}` }, { label: 'Gantt' }]} />
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/projects/${params.id}`)}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-lg font-semibold">{project.name}</h1>
            <p className="text-sm text-muted-foreground">Gantt Chart</p>
          </div>
        </div>
        <div className="text-center py-16 text-muted-foreground">No tasks yet. Create tasks with start and due dates to see them on the Gantt chart.</div>
      </div>
    );
  }

  const scrollHeight = rowIndex * ROW_H + 44;

  return (
    <div className="space-y-4">
      <Breadcrumb items={[{ label: 'Projects', href: '/projects' }, { label: project.name, href: `/projects/${params.id}` }, { label: 'Gantt' }]} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/projects/${params.id}`)}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-lg font-semibold">{project.name}</h1>
            <p className="text-sm text-muted-foreground">Gantt Chart</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border bg-muted/20">
            {ZOOM_OPTIONS.map((z) => (
              <button
                key={z}
                onClick={() => setZoom(z)}
                className={`px-2.5 py-1 text-xs font-medium capitalize transition-colors ${zoom === z ? 'bg-background border shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {z}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={scrollToToday} title="Scroll to today">
            <Calendar className="h-3.5 w-3.5 mr-1" />Today
          </Button>
          <span className="text-xs text-muted-foreground">{formatDate(dateRange.start)} – {formatDate(dateRange.end)}</span>
        </div>
      </div>

      <Separator />

      <div className="flex rounded-lg border overflow-hidden">
        {/* Left: Task List */}
        <div className="shrink-0 border-r" style={{ width: LEFT_W }}>
          <div className="h-10 flex items-center px-3 border-b bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Task
          </div>
          <div ref={leftRef} onScroll={() => syncScroll('left')} style={{ height: `calc(100vh - 280px)`, overflowY: 'auto' }}>
            <div style={{ height: scrollHeight }}>
              {groupedRows.map((row, idx) => {
                if (row.type === 'header') {
                  return (
                    <div key={`h-${idx}`} className="h-9 flex items-center px-3 border-b bg-muted/20 text-xs font-semibold text-muted-foreground sticky top-0 z-10">
                      {row.label}
                      <span className="ml-2 text-[10px] font-normal text-muted-foreground/60">({row.count})</span>
                    </div>
                  );
                }
                const b = (row as any).bar as GanttBar;
                return (
                  <div key={b.task.id} className="flex items-center px-3 border-b h-11 hover:bg-muted/10 transition-colors text-xs gap-2" style={{ minHeight: ROW_H }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {b.task.isMilestone && <Gem className="h-3 w-3 inline-block mr-1 align-[-2px] text-primary" />}
                        {b.task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {b.task.assignedTo && (
                          <span className="text-[10px] text-muted-foreground truncate">
                            {b.task.assignedTo.firstName} {b.task.assignedTo.lastName}
                          </span>
                        )}
                        {(b.task.startDate || b.task.dueDate) && (
                          <span className="text-[10px] text-muted-foreground">
                            {b.task.startDate ? formatDate(b.task.startDate) : '…'} – {b.task.dueDate ? formatDate(b.task.dueDate) : '…'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Timeline */}
        <div className="flex-1 overflow-hidden">
          <div className="border-b bg-muted/30" style={{ minWidth: totalWidth }}>
            <div className="flex h-5">
              {months.map((m, i) => (
                <div key={i} className="shrink-0 flex items-center px-2 text-[10px] font-medium text-muted-foreground/70 border-r overflow-hidden" style={{ width: m.width }}>
                  {m.label}
                </div>
              ))}
            </div>
            <div className="flex h-5 border-t relative">
              {weekMarkers.map((wm, i) => (
                <div key={i} className="absolute text-[9px] text-muted-foreground/50 px-1" style={{ left: Math.max(0, wm.x - (zoom === 'month' ? 0 : 12)), top: 2 }}>
                  {wm.label}
                </div>
              ))}
              {todayX > 0 && todayX < totalWidth && (
                <div className="absolute top-0 bottom-0 w-px bg-destructive/60 z-20" style={{ left: todayX }} title="Today" />
              )}
            </div>
          </div>

          <div ref={rightRef} onScroll={() => syncScroll('right')} style={{ height: `calc(100vh - 280px)`, overflow: 'auto' }}>
            <div style={{ height: scrollHeight, minWidth: totalWidth, position: 'relative' }}>
              {/* Weekend highlights */}
              {zoom === 'day' && weekends.map((dayIdx, i) => (
                <div
                  key={`we-${i}`}
                  className="absolute top-0 bottom-0 pointer-events-none"
                  style={{ left: dayIdx * DAY_W, width: DAY_W, backgroundColor: 'hsl(var(--muted) / 0.3)' }}
                />
              ))}

              {/* Grid lines */}
              {weekMarkers.map((wm, i) => (
                <div key={i} className="absolute top-0 bottom-0 w-px bg-border/40 pointer-events-none" style={{ left: wm.x }} />
              ))}
              {todayX > 0 && todayX < totalWidth && (
                <div className="absolute top-0 bottom-0 w-px bg-destructive/60 z-20 pointer-events-none" style={{ left: todayX }} />
              )}

              {/* Dependency arrows */}
              <svg className="absolute inset-0 pointer-events-none z-10" style={{ width: totalWidth, height: scrollHeight }}>
                {depArrows.map((arrow, i) => {
                  const fromY = rowY[arrow.fromTaskId];
                  const toY = rowY[arrow.toTaskId];
                  const fromBar = allBars.find(b => b.task.id === arrow.fromTaskId);
                  const toBar = allBars.find(b => b.task.id === arrow.toTaskId);
                  if (!fromBar || !toBar || fromY == null || toY == null) return null;
                  const fromTask = fromBar.task;
                  const toTask = toBar.task;
                  if (!fromTask.dueDate || !toTask.startDate) return null;

                  const x1 = (fromBar.startDays + fromBar.durationDays) * DAY_W;
                  const x2 = toBar.startDays * DAY_W;
                  const y1 = fromY;
                  const y2 = toY;
                  const midX = (x1 + x2) / 2;

                  return (
                    <g key={i}>
                      <path
                        d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                        fill="none"
                        stroke="hsl(var(--muted-foreground) / 0.5)"
                        strokeWidth={1.5}
                        strokeDasharray="4 3"
                      />
                      <polygon
                        points={`${x2},${y2} ${x2 - 6},${y2 - 3} ${x2 - 6},${y2 + 3}`}
                        fill="hsl(var(--muted-foreground) / 0.5)"
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Task bars / milestones */}
              {(() => {
                let rowIdx = 0;
                return groupedRows.map((row, _idx) => {
                  if (row.type === 'header') {
                    rowIdx++;
                    return null;
                  }
                  const b = (row as any).bar as GanttBar;
                  const y = 40 + rowIdx * ROW_H + (ROW_H - 24) / 2;
                  rowIdx++;

                  if (!b.hasDates) return null;

                  if (b.task.isMilestone) {
                    const cx = (b.startDays + b.durationDays) * DAY_W;
                    const cy = y + 12;
                    const s = 9;
                    return (
                      <div key={b.task.id} className="absolute left-0 group" style={{ top: y, height: 24 }}>
                        <svg style={{ position: 'absolute', left: cx - s, top: 0, width: s * 2, height: 24 }} className="pointer-events-none">
                          <polygon
                            points={`${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s} ${cx - s},${cy}`}
                            fill="hsl(var(--primary))"
                            className="group-hover:opacity-80 transition-opacity"
                          />
                        </svg>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded bg-popover border text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 shadow-lg">
                          <p className="font-semibold">{b.task.title}</p>
                          <p className="text-muted-foreground mt-0.5">Milestone</p>
                          {b.task.dueDate && (
                            <p className="text-muted-foreground">{formatDate(b.task.dueDate)}</p>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={b.task.id} className="absolute left-0" style={{ top: y, height: 24 }}>
                      <div
                        className={`h-6 rounded cursor-pointer hover:brightness-110 transition-all ${STATUS_COLORS[b.task.status] || 'bg-secondary'} relative group`}
                        style={{ marginLeft: b.startDays * DAY_W, width: Math.max(b.durationDays * DAY_W, 14) }}
                      >
                        <span className="px-2 text-[10px] font-medium text-white leading-6 block truncate opacity-0 group-hover:opacity-100 transition-opacity">
                          {b.task.title}
                        </span>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded bg-popover border text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 shadow-lg min-w-[180px]">
                          <p className="font-semibold">{b.task.title}</p>
                          <p className="text-muted-foreground mt-0.5">{humanizeStatus(b.task.status)} · {humanizeStatus(b.task.priority)}</p>
                          {b.task.assignedTo && <p className="text-muted-foreground">{b.task.assignedTo.firstName} {b.task.assignedTo.lastName}</p>}
                          {b.task.startDate && b.task.dueDate && (
                            <p className="text-muted-foreground">{formatDate(b.task.startDate)} – {formatDate(b.task.dueDate)} ({b.durationDays}d)</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
