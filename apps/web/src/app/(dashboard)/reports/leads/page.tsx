'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Percent, Target } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

const COLS = ['#6366f1', '#10b981', '#f59e0b', '#0ea5e9', '#8b5cf6', '#ef4444', '#ec4899'];

export default function LeadReportPage() {
  const { activeTenant } = useAuthStore();
  const [data, setData] = useState<any>(null);
  useEffect(() => { if (activeTenant) api.get('/api/v1/tenant/reports/leads', { tenantId: activeTenant.id }).then(setData); }, [activeTenant]);
  if (!data) return <Skeleton className="h-96" />;
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Lead Report</h2>
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Leads" value={data.total} icon={Users} tone="info" />
        <StatCard label="Conversion Rate" value={`${data.conversionRate}%`} icon={Percent} tone="success" />
        <StatCard label="Sources" value={data.sourceData.length} icon={Target} tone="default" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card><CardHeader><CardTitle>By Source</CardTitle></CardHeader><CardContent>
          <ResponsiveContainer width="100%" height={250}><PieChart><Pie data={data.sourceData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label>{data.sourceData.map((_: any, i: number) => <Cell key={i} fill={COLS[i % COLS.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>By Status</CardTitle></CardHeader><CardContent>
          <ResponsiveContainer width="100%" height={250}><PieChart><Pie data={data.statusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label>{data.statusData.map((_: any, i: number) => <Cell key={i} fill={COLS[i % COLS.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer>
        </CardContent></Card>
      </div>
    </div>
  );
}
