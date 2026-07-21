'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatMoney } from '@/lib/utils';

export default function ProfitLossReportPage() {
  const { activeTenant } = useAuthStore();
  const [data, setData] = useState<any>(null);
  useEffect(() => { if (activeTenant) {
    Promise.all([
      api.get('/api/v1/tenant/reports/finance', { tenantId: activeTenant.id }),
      api.get('/api/v1/tenant/reports/tax', { tenantId: activeTenant.id }),
    ]).then(([f, t]: any[]) => setData({ ...f, tax: t }));
  }}, [activeTenant]);
  if (!data) return <Skeleton className="h-96" />;
  const profitData = data.data.map((d: any) => ({ name: d.month, profit: d.profit }));
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Profit & Loss</h2>
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Revenue" value={formatMoney(data.summary.totalRevenue, 'USD')} icon={TrendingUp} tone="success" />
        <StatCard label="Expenses" value={formatMoney(data.summary.totalExpenses, 'USD')} icon={TrendingDown} tone="destructive" />
        <StatCard label="Net Profit" value={formatMoney(data.summary.profit, 'USD')} icon={DollarSign} tone={data.summary.profit >= 0 ? 'success' : 'destructive'} />
      </div>
      <Card>
        <CardHeader><CardTitle>Monthly Profit</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={profitData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: any) => formatMoney(Number(v), 'USD')} />
              <Bar dataKey="profit" radius={[6, 6, 0, 0]}>
                {profitData.map((d: any) => <Cell key={d.name} fill={d.profit >= 0 ? '#10b981' : '#ef4444'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
