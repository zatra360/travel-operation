'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/page-header';
import { Users, Percent, Target, TrendingUp, TrendingDown } from 'lucide-react';
import { PieChart, Pie, BarChart, Bar, Cell, Tooltip, ResponsiveContainer, Legend, XAxis, YAxis, CartesianGrid } from 'recharts';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

const COLS = ['#6366f1', '#10b981', '#f59e0b', '#0ea5e9', '#8b5cf6', '#ef4444', '#ec4899', '#f97316', '#14b8a6'];

const STATUS_COLORS: Record<string, string> = {
  NEW: '#0ea5e9', CONTACTED: '#6366f1', QUALIFIED: '#8b5cf6',
  QUOTATION_SENT: '#f59e0b', NEGOTIATION: '#f97316', WON: '#10b981', LOST: '#ef4444',
};

export default function LeadReportPage() {
  const { activeTenant } = useAuthStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeTenant) return;
    setLoading(true);
    api.get<any>('/api/v1/tenant/reports/leads', { tenantId: activeTenant.id })
      .then(setData).finally(() => setLoading(false));
  }, [activeTenant]);

  if (loading) return <div className="space-y-6"><Skeleton className="h-8 w-48" /><div className="grid grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div><div className="grid gap-6 md:grid-cols-2"><Skeleton className="h-80" /><Skeleton className="h-80" /></div></div>;
  if (!data) return null;

  const wonCount = data.statusData.find((s: any) => s.name === 'WON')?.value || 0;
  const lostCount = data.statusData.find((s: any) => s.name === 'LOST')?.value || 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Lead Report" subtitle="Pipeline analytics and conversion metrics" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Leads" value={data.total} hint={`${data.conversionRate}% conversion`} icon={Users} tone="info" />
        <StatCard label="Won" value={wonCount} hint={`${wonCount} converted`} icon={TrendingUp} tone="success" />
        <StatCard label="Lost" value={lostCount} hint={`${lostCount} lost`} icon={TrendingDown} tone="destructive" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Leads by Source</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={data.sourceData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name} (${value})`}>
                  {data.sourceData.map((_: any, i: number) => <Cell key={i} fill={COLS[i % COLS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Leads by Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.statusData.map((s: any) => ({ ...s, fill: STATUS_COLORS[s.name] || '#6366f1' }))} barSize={36}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.4} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 13 }} cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="value" name="Count" radius={[6, 6, 0, 0]}>
                  {data.statusData.map((_: any, i: number) => <Cell key={i} fill={STATUS_COLORS[_.name] || COLS[i % COLS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
