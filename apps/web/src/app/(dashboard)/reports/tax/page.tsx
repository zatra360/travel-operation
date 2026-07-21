'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatMoney } from '@/lib/utils';

export default function TaxReportPage() {
  const { activeTenant } = useAuthStore();
  const [data, setData] = useState<any>(null);
  useEffect(() => { if (activeTenant) api.get('/api/v1/tenant/reports/tax', { tenantId: activeTenant.id }).then(setData); }, [activeTenant]);
  if (!data) return <Skeleton className="h-96" />;
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Tax Report</h2>
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Total Tax Collected" value={formatMoney(data.totalTax, 'USD')} icon={DollarSign} tone="info" />
        <StatCard label="Months" value={data.data.length} icon={TrendingUp} tone="default" />
      </div>
      <Card>
        <CardHeader><CardTitle>Tax Collected (6 months)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.data}>
              <defs><linearGradient id="taxGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: any) => formatMoney(Number(v), 'USD')} />
              <Area type="monotone" dataKey="tax" stroke="#6366f1" strokeWidth={2} fill="url(#taxGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
