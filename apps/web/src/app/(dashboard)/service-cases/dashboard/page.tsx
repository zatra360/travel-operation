'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { Breadcrumb, PageHeader } from '@/components/ui/page-header';
import { AlertTriangle, Clock, DollarSign, FolderOpen, PlayCircle, TrendingUp, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { cn, formatDateTime } from '@/lib/utils';
import { humanizeStatus } from '@/lib/status';
import { serviceIcon } from '@/lib/service-ops';

export default function ServiceDashboardPage() {
  const { activeTenant } = useAuthStore();
  const [dashboard, setDashboard] = useState<any>(null);
  const [sla, setSla] = useState<any>(null);
  const [workload, setWorkload] = useState<any[]>([]);
  const [bottlenecks, setBottlenecks] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const load = useCallback(() => {
    if (!activeTenant) return;
    setLoading(true);
    Promise.all([
      api.get<any>('/api/v1/tenant/service-reports/dashboard', { tenantId: activeTenant.id }),
      api.get<any>('/api/v1/tenant/service-reports/sla', { tenantId: activeTenant.id }),
      api.get<any[]>('/api/v1/tenant/service-reports/workload', { tenantId: activeTenant.id }),
      api.get<any>('/api/v1/tenant/service-reports/bottlenecks', { tenantId: activeTenant.id }),
    ])
      .then(([d, s, w, b]) => { setDashboard(d); setSla(s); setWorkload(w); setBottlenecks(b); })
      .catch((err) => toast.error(err.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, [activeTenant]);

  useEffect(() => { load(); }, [load]);

  const runScan = async () => {
    if (!activeTenant) return;
    setScanning(true);
    try {
      const result = await api.post<any>('/api/v1/tenant/service-reports/automation/scan', {}, { tenantId: activeTenant.id });
      toast.success(`Scan complete: ${result.breached} breached, ${result.warnings} warnings, ${result.ttlAlerts} TTL alerts, ${result.tasksCreated} task(s) created`);
      load();
    } catch (err: any) {
      toast.error(err.message || 'Scan failed');
    } finally {
      setScanning(false);
    }
  };

  if (loading || !dashboard) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div><Skeleton className="h-72" /></div>;
  }

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Service Cases', href: '/service-cases' }, { label: 'Dashboard' }]} />
      <PageHeader
        title="Service Operations Dashboard"
        subtitle="Volumes, SLA health, workload and workflow bottlenecks across all services"
        actions={
          <Button size="sm" variant="outline" onClick={runScan} disabled={scanning}>
            <PlayCircle className="mr-2 h-4 w-4" />{scanning ? 'Scanning…' : 'Run SLA/TTL scan'}
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active items" value={dashboard.totals.active} icon={FolderOpen} index={0} />
        <StatCard label="SLA breached" value={dashboard.totals.slaBreached} icon={AlertTriangle} tone={dashboard.totals.slaBreached > 0 ? 'destructive' : 'success'} index={1} />
        <StatCard label="Due within 24h" value={dashboard.totals.slaDueSoon} icon={Clock} tone={dashboard.totals.slaDueSoon > 0 ? 'warning' : 'default'} index={2} />
        <StatCard label="Gross profit" value={dashboard.totals.profit.toFixed(2)} icon={TrendingUp} tone="success" index={3} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4" />Per-Service Performance</CardTitle></CardHeader>
        <CardContent>
          {dashboard.services.length === 0 ? (
            <p className="text-sm text-muted-foreground">No service items yet. <Link className="text-primary hover:underline" href="/service-cases/new">Create a case</Link> to get started.</p>
          ) : (
            <div className="space-y-2">
              {dashboard.services.map((s: any) => {
                const Icon = serviceIcon(s.icon);
                return (
                  <div key={s.systemCode} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{s.displayName}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span><strong className="text-foreground">{s.active}</strong> active</span>
                      <span><strong className="text-foreground">{s.completed}</strong> done</span>
                      {s.avgCompletionHours !== null && <span>avg {s.avgCompletionHours}h</span>}
                      <span className="tabular-nums">rev <strong className="text-foreground">{s.revenue.toFixed(0)}</strong></span>
                      <span className={cn('tabular-nums font-medium', s.profit >= 0 ? 'text-emerald-600' : 'text-destructive')}>profit {s.profit.toFixed(0)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" />SLA Attention ({(sla?.breached.length ?? 0) + (sla?.atRisk.length ?? 0)})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {sla && sla.breached.length === 0 && sla.atRisk.length === 0 && (
              <p className="text-sm text-muted-foreground">No breached or at-risk items. 🎯</p>
            )}
            {sla?.breached.map((i: any) => (
              <SlaRow key={i.id} item={i} breached />
            ))}
            {sla?.atRisk.map((i: any) => (
              <SlaRow key={i.id} item={i} />
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" />Workload</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {workload.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active items.</p>
              ) : (
                workload.map((w) => (
                  <div key={w.assignedToId ?? 'unassigned'} className="flex items-center justify-between rounded-md border p-2 text-sm">
                    <span className="font-medium">{w.assigneeName}</span>
                    <span className="text-xs text-muted-foreground">
                      {w.activeItems} active
                      {w.overdueItems > 0 && <Badge variant="destructive" className="ml-2 text-[10px]">{w.overdueItems} overdue</Badge>}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" />Slowest Stages</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {(!bottlenecks || bottlenecks.slowestStages.length === 0) ? (
                <p className="text-sm text-muted-foreground">Not enough completed stages yet.</p>
              ) : (
                bottlenecks.slowestStages.slice(0, 8).map((s: any) => (
                  <div key={s.stageCode} className="flex items-center justify-between text-sm">
                    <span className="truncate">{s.stageName}</span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{s.avgHours}h avg · {s.samples}x</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SlaRow({ item, breached = false }: { item: any; breached?: boolean }) {
  const Icon = serviceIcon(item.serviceType.icon);
  return (
    <Link
      href={`/service-cases/${item.serviceCase.id}`}
      className={cn(
        'flex items-center justify-between gap-2 rounded-md border p-2 text-sm transition-colors hover:bg-accent',
        breached && 'border-destructive/40 bg-destructive/5',
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="truncate font-medium">{item.referenceNumber}</p>
          <p className="truncate text-xs text-muted-foreground">
            {humanizeStatus(item.currentStageCode ?? '')} · {item.assigneeName ?? 'Unassigned'}
          </p>
        </div>
      </div>
      <span className={cn('shrink-0 text-xs', breached ? 'font-medium text-destructive' : 'text-muted-foreground')}>
        {breached ? 'Breached' : 'Due'} {formatDateTime(item.slaDueAt)}
      </span>
    </Link>
  );
}
