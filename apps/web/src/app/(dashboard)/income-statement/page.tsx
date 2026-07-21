'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { humanizeStatus } from '@/lib/status';
import { IncomeStatementResponse } from '@/lib/accounting';

const LineItem = ({ label, value, bold, negative }: { label: string; value: number; bold?: boolean; negative?: boolean }) => (
  <div className={cn('flex items-center justify-between rounded-md px-3 py-1.5 text-sm', bold && 'border-t pt-2 font-semibold')}>
    <span>{label}</span>
    <span className={cn('tabular-nums shrink-0', negative ? (value >= 0 ? 'text-red-600' : 'text-emerald-600') : (value >= 0 ? 'text-emerald-600' : 'text-red-600'))}>{value.toFixed(2)}</span>
  </div>
);

export default function IncomeStatementPage() {
  const { activeTenant } = useAuthStore();
  const [data, setData] = useState<IncomeStatementResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = useCallback(() => {
    if (!activeTenant) return;
    const params = new URLSearchParams();
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    api.get<IncomeStatementResponse>(`/api/v1/tenant/accounting/reports/income-statement?${params.toString()}`, { tenantId: activeTenant.id })
      .then(setData)
      .catch((err) => toast.error(err.message || 'Failed to load income statement'))
      .finally(() => setLoading(false));
  }, [activeTenant, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-72" /></div>;
  if (!data) return null;

  const SubSection = ({ label, accounts, total }: { label: string; accounts: any[]; total: number }) => (
    <div className="space-y-1">
      {accounts.length > 0 && <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{label}</h4>}
      {accounts.map((a: any) => (
        <div key={a.id} className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm">
          <span className="truncate">{a.accountName}</span>
          <span className={cn('tabular-nums shrink-0', a.balance >= 0 ? 'text-emerald-600' : 'text-red-600')}>{Number(a.balance).toFixed(2)}</span>
        </div>
      ))}
      {accounts.length > 0 && <div className="flex justify-between px-3 py-0.5 text-xs text-muted-foreground"><span>Subtotal</span><span className="tabular-nums">{total.toFixed(2)}</span></div>}
    </div>
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Income Statement" subtitle="Profit or loss from posted journals (Tripnow audit-sample structure)" />
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1"><span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">From</span><Input type="date" className="w-44" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></div>
        <div className="space-y-1"><span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">To</span><Input type="date" className="w-44" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" />Period {new Date(data.period.from).toLocaleDateString()} — {new Date(data.period.to).toLocaleDateString()}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SubSection label="Revenue" accounts={data.revenue.accounts} total={data.revenue.total} />
          <SubSection label="Cost of services" accounts={data.costOfServices.accounts} total={data.costOfServices.total} />
          <LineItem label="Gross profit" value={data.grossProfit} bold />

          <SubSection label="Operating expenses" accounts={data.expenses.accounts} total={data.expenses.total} />
          <LineItem label="Operating profit" value={data.operatingProfit} bold />

          <SubSection label="Other income" accounts={data.otherIncome.accounts} total={data.otherIncome.total} />
          <SubSection label="Other expenses" accounts={data.otherExpense.accounts} total={data.otherExpense.total} />

          <Separator />
          <LineItem label="Net profit / (loss)" value={data.netProfit} bold />
        </CardContent>
      </Card>
    </div>
  );
}
