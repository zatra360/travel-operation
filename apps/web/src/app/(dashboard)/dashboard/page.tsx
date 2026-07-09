'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Plane, FileText, Receipt, TrendingUp, Activity, Ticket, RefreshCw, UserCheck, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDateTime } from '@/lib/utils';
import { DashboardOverview } from '@/lib/crm';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [noTenant, setNoTenant] = useState(false);
  const { activeTenant, activeBranch } = useAuthStore();

  useEffect(() => {
    if (!activeTenant) { setNoTenant(true); setLoading(false); return; }
    setNoTenant(false);
    api.get<DashboardOverview>('/api/v1/tenant/dashboard/stats', {
      tenantId: activeTenant.id,
      branchId: activeBranch?.id,
    })
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeTenant, activeBranch]);

  if (noTenant) {
    return <div className="flex items-center justify-center h-64"><div className="text-center"><p className="text-lg font-medium">No company assigned</p><p className="text-sm text-muted-foreground mt-1">Select a company or contact your admin.</p></div></div>;
  }

  if (loading) {
    return (
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-7 w-12" /></div>
        ))}
      </div>
    );
  }

  const cards = [
    { label: 'Leads', value: stats?.leads.total ?? 0, sub: stats?.leads.new ? `${stats.leads.new} new` : '', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Clients', value: stats?.clients.total ?? 0, sub: stats?.clients.active ? `${stats.clients.active} active` : '', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Quotations', value: stats?.quotations?.total ?? 0, sub: stats?.quotations?.pending ? `${stats.quotations.pending} pending` : '', icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Bookings', value: stats?.bookings.total ?? 0, sub: stats?.bookings.ticketed ? `${stats.bookings.ticketed} ticketed` : '', icon: Plane, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Invoices', value: stats?.invoices.total ?? 0, sub: stats?.invoices.unpaid ? `${stats.invoices.unpaid} unpaid` : '', icon: Receipt, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Tickets', value: stats?.tickets?.total ?? 0, sub: stats?.tickets?.pending ? `${stats.tickets.pending} pending` : '', icon: Ticket, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { label: 'Refunds', value: stats?.refunds?.total ?? 0, sub: stats?.refunds?.pending ? `${stats.refunds.pending} pending` : '', icon: RefreshCw, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Employees', value: stats?.employees?.total ?? 0, sub: stats?.employees?.active ? `${stats.employees.active} active` : '', icon: UserCheck, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  const alerts: { label: string; value: number; icon: any; color: string }[] = [];
  if (stats?.bookings.held) alerts.push({ label: 'Bookings on hold', value: stats.bookings.held, icon: AlertTriangle, color: 'text-amber-600' });
  if (stats?.invoices.overdue) alerts.push({ label: 'Overdue invoices', value: stats.invoices.overdue, icon: AlertTriangle, color: 'text-red-600' });
  if (stats?.refunds?.pending) alerts.push({ label: 'Pending refunds', value: stats.refunds.pending, icon: AlertTriangle, color: 'text-amber-600' });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          {activeTenant?.name} — {activeBranch?.name || 'All Branches'}
        </p>
      </div>

      {alerts.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {alerts.map((a) => (
            <Card key={a.label} className="border-amber-200 bg-amber-50">
              <CardContent className="flex items-center gap-3 py-3">
                <a.icon className={`h-5 w-5 ${a.color}`} />
                <div>
                  <p className="text-sm font-medium">{a.label}</p>
                  <p className="text-lg font-bold">{a.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="overflow-hidden border-l-2 hover:shadow-md transition-shadow" style={{ borderLeftColor: card.color === 'text-blue-600' ? '#2563eb' : card.color === 'text-emerald-600' ? '#059669' : card.color === 'text-purple-600' ? '#7c3aed' : card.color === 'text-orange-600' ? '#ea580c' : card.color === 'text-rose-600' ? '#e11d48' : card.color === 'text-cyan-600' ? '#0891b2' : card.color === 'text-amber-600' ? '#d97706' : card.color === 'text-indigo-600' ? '#4f46e5' : '#6b7280' }}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
                <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.bg}`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">{card.value}</div>
                {card.sub && <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4" /> Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.recentActivity?.length ? (
            <div className="space-y-3">
              {stats.recentActivity.slice(0, 20).map((event) => (
                <div key={event.id} className="flex items-start gap-3 border-b pb-2 last:border-0">
                  <div className="mt-0.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{event.subject}</p>
                    <p className="text-xs text-muted-foreground">{event.userName} · {formatDateTime(event.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No recent activity</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
