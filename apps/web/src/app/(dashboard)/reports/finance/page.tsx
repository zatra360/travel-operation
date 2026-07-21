'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, DollarSign, FileText, Clock } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatMoney } from '@/lib/utils';

const C = { revenue: '#6366f1', expenses: '#ef4444', profit: '#10b981' };

export default function FinanceReportPage() {
  const { activeTenant } = useAuthStore();
  const [data, setData] = useState<any>(null);
  useEffect(() => { if (activeTenant) api.get('/api/v1/tenant/reports/finance', { tenantId: activeTenant.id }).then(setData); }, [activeTenant]);
  if (!data) return <Skeleton className="h-96" />;
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Finance Report</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Revenue" value={formatMoney(data.summary.totalRevenue, 'USD')} icon={TrendingUp} tone="success" />
        <StatCard label="Expenses" value={formatMoney(data.summary.totalExpenses, 'USD')} icon={TrendingDown} tone="destructive" />
        <StatCard label="Profit" value={formatMoney(data.summary.profit, 'USD')} icon={DollarSign} tone="default" />
        <StatCard label="Unpaid" value={data.summary.unpaidInvoices} icon={Clock} tone="warning" />
      </div>
      <Card>
        <CardHeader><CardTitle>Revenue vs Expenses</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: any) => formatMoney(Number(v), 'USD')} />
              <Bar dataKey="revenue" fill={C.revenue} radius={[4, 4, 0, 0]} name="Revenue" />
              <Bar dataKey="expenses" fill={C.expenses} radius={[4, 4, 0, 0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
