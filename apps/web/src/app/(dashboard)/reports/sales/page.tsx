'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, DollarSign, Percent } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatMoney } from '@/lib/utils';

const COLS = ['#6366f1', '#10b981', '#f59e0b', '#0ea5e9', '#8b5cf6'];

export default function SalesReportPage() {
  const { activeTenant } = useAuthStore();
  const [data, setData] = useState<any>(null);
  useEffect(() => { if (activeTenant) api.get('/api/v1/tenant/reports/sales', { tenantId: activeTenant.id }).then(setData); }, [activeTenant]);
  if (!data) return <Skeleton className="h-96" />;
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Sales Report</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="This Month" value={formatMoney(data.thisMonth, 'USD')} icon={DollarSign} tone="success" />
        <StatCard label="Last Month" value={formatMoney(data.lastMonth, 'USD')} icon={DollarSign} tone="default" />
        <StatCard label="Growth" value={`${data.growth}%`} icon={Percent} tone={data.growth >= 0 ? 'success' : 'destructive'} />
      </div>
      <Card>
        <CardHeader><CardTitle>Pipeline</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.pipeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>{data.pipeline.map((_: any, i: number) => <Cell key={i} fill={COLS[i]} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
