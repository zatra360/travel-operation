'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Users,
  Plane,
  FileText,
  Receipt,
  TrendingUp,
  Activity,
  Ticket,
  RefreshCw,
  UserCheck,
  AlertTriangle,
} from 'lucide-react';
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
    if (!activeTenant) {
      setNoTenant(true);
      setLoading(false);
      return;
    }
    setNoTenant(false);
    setLoading(true);
    api
      .get<DashboardOverview>('/api/v1/tenant/dashboard/stats', {
        tenantId: activeTenant.id,
        branchId: activeBranch?.id,
      })
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeTenant, activeBranch]);

  if (noTenant) {
    return (
      <EmptyState
        title="No company assigned"
        description="Select a company from the switcher, or contact your administrator."
      />
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-2 rounded-lg border p-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-7 w-12" />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    { label: 'Leads', value: stats?.leads.total ?? 0, hint: stats?.leads.new ? `${stats.leads.new} new` : undefined, icon: Users, href: '/leads' },
    { label: 'Clients', value: stats?.clients.total ?? 0, hint: stats?.clients.active ? `${stats.clients.active} active` : undefined, icon: TrendingUp, href: '/clients' },
    { label: 'Quotations', value: stats?.quotations?.total ?? 0, hint: stats?.quotations?.pending ? `${stats.quotations.pending} pending` : undefined, icon: FileText, href: '/quotations' },
    { label: 'Bookings', value: stats?.bookings.total ?? 0, hint: stats?.bookings.ticketed ? `${stats.bookings.ticketed} ticketed` : undefined, icon: Plane, href: '/bookings' },
    { label: 'Invoices', value: stats?.invoices.total ?? 0, hint: stats?.invoices.unpaid ? `${stats.invoices.unpaid} unpaid` : undefined, icon: Receipt, href: '/invoices' },
    { label: 'Tickets', value: stats?.tickets?.total ?? 0, hint: stats?.tickets?.pending ? `${stats.tickets.pending} pending` : undefined, icon: Ticket, href: '/tickets' },
    { label: 'Refunds', value: stats?.refunds?.total ?? 0, hint: stats?.refunds?.pending ? `${stats.refunds.pending} pending` : undefined, icon: RefreshCw, href: '/refunds' },
    { label: 'Employees', value: stats?.employees?.total ?? 0, hint: stats?.employees?.active ? `${stats.employees.active} active` : undefined, icon: UserCheck, href: '/employees' },
  ];

  const alerts: { label: string; value: number; tone: 'warning' | 'destructive'; href: string }[] = [];
  if (stats?.bookings.held) alerts.push({ label: 'Bookings on hold', value: stats.bookings.held, tone: 'warning', href: '/bookings' });
  if (stats?.invoices.overdue) alerts.push({ label: 'Overdue invoices', value: stats.invoices.overdue, tone: 'destructive', href: '/invoices' });
  if (stats?.refunds?.pending) alerts.push({ label: 'Pending refunds', value: stats.refunds.pending, tone: 'warning', href: '/refunds' });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          {activeTenant?.name} — {activeBranch?.name || 'All Branches'}
        </p>
      </div>

      {alerts.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {alerts.map((a) => (
            <Link key={a.label} href={a.href} className="focus-visible:outline-none">
              <Card
                className={
                  a.tone === 'destructive'
                    ? 'border-destructive/30 bg-destructive/5 transition-shadow hover:shadow-md'
                    : 'border-warning/30 bg-warning/10 transition-shadow hover:shadow-md'
                }
              >
                <CardContent className="flex items-center gap-3 py-3">
                  <AlertTriangle
                    className={a.tone === 'destructive' ? 'h-5 w-5 text-destructive' : 'h-5 w-5 text-warning'}
                  />
                  <div>
                    <p className="text-sm font-medium">{a.label}</p>
                    <p className="text-lg font-bold tabular-nums">{a.value}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {cards.map((card) => (
          <StatCard
            key={card.label}
            label={card.label}
            value={card.value}
            hint={card.hint}
            icon={card.icon}
            href={card.href}
          />
        ))}
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
                  <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{event.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {event.userName} · {formatDateTime(event.createdAt)}
                    </p>
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
