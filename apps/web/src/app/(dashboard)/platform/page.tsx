'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, Shield, Activity } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface PlatformStats {
  activeTenants: number;
  totalUsers: number;
  platformAdmins: number;
  recentTenants: Array<{
    id: string; name: string; slug: string; status: string; createdAt: string;
    _count: { users: number; branches: number };
  }>;
}

export default function PlatformDashboardPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<PlatformStats>('/api/v1/platform/dashboard/stats')
      .then(setStats).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading dashboard...</p></div>;

  const cards = [
    { label: 'Active Companies', value: stats?.activeTenants ?? 0, icon: Building2, color: 'text-blue-600' },
    { label: 'Total Users', value: stats?.totalUsers ?? 0, icon: Users, color: 'text-emerald-600' },
    { label: 'Platform Admins', value: stats?.platformAdmins ?? 0, icon: Shield, color: 'text-purple-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Platform Dashboard</h2>
        <p className="text-muted-foreground">SaaS platform management overview</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{card.value}</div></CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-4 w-4" />Recent Companies</CardTitle></CardHeader>
        <CardContent>
          {stats?.recentTenants?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left"><th className="pb-3 font-medium">Name</th><th className="pb-3 font-medium">Slug</th><th className="pb-3 font-medium">Status</th><th className="pb-3 font-medium">Users</th><th className="pb-3 font-medium">Branches</th><th className="pb-3 font-medium">Created</th></tr></thead>
                <tbody>{stats.recentTenants.map((t) => (
                  <tr key={t.id} className="border-b last:border-0">
                    <td className="py-3 font-medium">{t.name}</td>
                    <td className="py-3 text-muted-foreground">{t.slug}</td>
                    <td className="py-3"><Badge variant={t.status === 'ACTIVE' ? 'success' : 'secondary'}>{t.status}</Badge></td>
                    <td className="py-3">{t._count.users}</td>
                    <td className="py-3">{t._count.branches}</td>
                    <td className="py-3 text-muted-foreground">{formatDate(t.createdAt)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : <p className="text-sm text-muted-foreground">No companies yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
