'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Plane, FileText, Receipt, TrendingUp, Activity } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDateTime } from '@/lib/utils';

interface DashboardStats {
  leads: { total: number };
  clients: { total: number };
  quotations: { total: number };
  bookings: { total: number };
  invoices: { total: number };
  recentActivity: Array<{
    id: string;
    action: string;
    entity: string;
    createdAt: string;
    actor: { firstName: string; lastName: string; email: string };
  }>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { activeTenant, activeBranch } = useAuthStore();

  useEffect(() => {
    if (!activeTenant) return;
    api.get<DashboardStats>('/api/v1/tenant/dashboard/stats', {
      tenantId: activeTenant.id,
      branchId: activeBranch?.id,
    })
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeTenant, activeBranch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  const cards = [
    { label: 'Leads', value: stats?.leads.total ?? 0, icon: Users, color: 'text-blue-600' },
    { label: 'Clients', value: stats?.clients.total ?? 0, icon: TrendingUp, color: 'text-emerald-600' },
    { label: 'Quotations', value: stats?.quotations.total ?? 0, icon: FileText, color: 'text-purple-600' },
    { label: 'Bookings', value: stats?.bookings.total ?? 0, icon: Plane, color: 'text-orange-600' },
    { label: 'Invoices', value: stats?.invoices.total ?? 0, icon: Receipt, color: 'text-rose-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          {activeTenant?.name} - {activeBranch?.name || 'All Branches'}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.recentActivity?.length ? (
            <div className="space-y-4">
              {stats.recentActivity.map((log) => (
                <div key={log.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div>
                    <p className="text-sm font-medium">
                      {log.actor.firstName} {log.actor.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {log.action} - {log.entity}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {log.action}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(log.createdAt)}
                    </span>
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
