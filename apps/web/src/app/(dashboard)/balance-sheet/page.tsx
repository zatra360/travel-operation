'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/ui/input';
import { CheckCircle, AlertTriangle, Scale } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { humanizeStatus } from '@/lib/status';
import { BalanceSheetResponse } from '@/lib/accounting';

const Section = ({ label, accounts, total }: { label: string; accounts: any[]; total: number }) => (
  <div>
    <h3 className="mb-2 text-sm font-semibold">{label}</h3>
    <div className="space-y-1">
      {accounts.map((a: any) => (
        <div key={a.id} className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm">
          <span className="truncate">{a.accountName}</span>
          <span className={cn('tabular-nums shrink-0', a.balance >= 0 ? 'text-emerald-600' : 'text-red-600')}>{Number(a.balance).toFixed(2)}</span>
        </div>
      ))}
    </div>
    <div className="mt-1.5 flex justify-between border-t pt-1.5 text-sm font-semibold"><span>Total {label.toLowerCase()}</span><span className="tabular-nums">{total.toFixed(2)}</span></div>
  </div>
);

export default function BalanceSheetPage() {
  const { activeTenant } = useAuthStore();
  const [data, setData] = useState<BalanceSheetResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [asOf, setAsOf] = useState('');

  const load = useCallback(() => {
    if (!activeTenant) return;
    const params = new URLSearchParams();
    if (asOf) params.set('asOf', asOf);
    api.get<BalanceSheetResponse>(`/api/v1/tenant/accounting/reports/balance-sheet?${params.toString()}`, { tenantId: activeTenant.id })
      .then(setData)
      .catch((err) => toast.error(err.message || 'Failed to load balance sheet'))
      .finally(() => setLoading(false));
  }, [activeTenant, asOf]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-72" /></div>;
  if (!data) return null;

  return (
    <div className="space-y-5">
      <PageHeader title="Balance Sheet" subtitle="Statement of financial position" />
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1"><span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">As of</span><Input type="date" className="w-44" value={asOf} onChange={(e) => setAsOf(e.target.value)} /></div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Scale className="h-4 w-4" />Position as of {new Date(data.asOf).toLocaleDateString()}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Section label="Assets" accounts={data.assets.accounts} total={data.assets.total} />
            <div className="space-y-6">
              <Section label="Liabilities" accounts={data.liabilities.accounts} total={data.liabilities.total} />
              <div>
                <h3 className="mb-2 text-sm font-semibold">Equity</h3>
                <div className="space-y-1">
                  {data.equity.accounts.map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm">
                      <span className="truncate">{a.accountName}</span>
                      <span className={cn('tabular-nums shrink-0', a.balance >= 0 ? 'text-emerald-600' : 'text-red-600')}>{Number(a.balance).toFixed(2)}</span>
                    </div>
                  ))}
                  {data.equity.currentPeriodEarnings !== 0 && (
                    <div className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm">
                      <span className="truncate italic">Current period earnings</span>
                      <span className={cn('tabular-nums shrink-0', data.equity.currentPeriodEarnings >= 0 ? 'text-emerald-600' : 'text-red-600')}>{data.equity.currentPeriodEarnings.toFixed(2)}</span>
                    </div>
                  )}
                </div>
                <div className="mt-1.5 flex justify-between border-t pt-1.5 text-sm font-semibold"><span>Total equity</span><span className="tabular-nums">{data.equity.total.toFixed(2)}</span></div>
              </div>
            </div>
          </div>

          <div className={cn('flex items-center gap-2 rounded-md border p-3 text-sm', data.isBalanced ? 'border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/20' : 'border-destructive/40 bg-destructive/5')}>
            {data.isBalanced ? <CheckCircle className="h-5 w-5 text-emerald-600" /> : <AlertTriangle className="h-5 w-5 text-destructive" />}
            <span className={data.isBalanced ? 'font-medium text-emerald-700 dark:text-emerald-400' : 'font-medium text-destructive'}>
              {data.isBalanced ? `Assets (${data.assets.total.toFixed(2)}) = Liabilities (${data.liabilities.total.toFixed(2)}) + Equity (${data.equity.total.toFixed(2)}). Balance sheet is square.` : 'Balance sheet does not balance — investigate journal entries.'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
