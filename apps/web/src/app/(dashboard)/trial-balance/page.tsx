'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/ui/input';
import { CheckCircle, AlertTriangle, Calculator } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { humanizeStatus } from '@/lib/status';
import { TrialBalanceResponse } from '@/lib/accounting';

export default function TrialBalancePage() {
  const { activeTenant } = useAuthStore();
  const [data, setData] = useState<TrialBalanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = useCallback(() => {
    if (!activeTenant) return;
    const params = new URLSearchParams();
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    api.get<TrialBalanceResponse>(`/api/v1/tenant/accounting/reports/trial-balance?${params.toString()}`, { tenantId: activeTenant.id })
      .then(setData)
      .catch((err) => toast.error(err.message || 'Failed to load trial balance'))
      .finally(() => setLoading(false));
  }, [activeTenant, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-72" /></div>;
  if (!data) return null;

  return (
    <div className="space-y-5">
      <PageHeader title="Trial Balance" subtitle="Debit and credit totals per account from posted journals" />

      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1"><span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">From</span><Input type="date" className="w-44" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></div>
        <div className="space-y-1"><span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">To</span><Input type="date" className="w-44" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></div>
      </div>

      <div className={cn('flex items-center gap-2 rounded-md border p-3 text-sm', data.isBalanced ? 'border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/20' : 'border-destructive/40 bg-destructive/5')}>
        {data.isBalanced ? <CheckCircle className="h-5 w-5 text-emerald-600" /> : <AlertTriangle className="h-5 w-5 text-destructive" />}
        <span className={data.isBalanced ? 'font-medium text-emerald-700 dark:text-emerald-400' : 'font-medium text-destructive'}>
          {data.isBalanced ? 'Trial balance squares — total debits equal total credits.' : 'Imbalanced — debits do not equal credits.'}
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Calculator className="h-4 w-4" />Accounts ({data.accounts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground"><th className="py-2 pr-4">Code</th><th className="py-2 pr-4">Account</th><th className="py-2 pr-4">Type</th><th className="py-2 pr-4 text-right">Debit</th><th className="py-2 pr-4 text-right">Credit</th><th className="py-2 text-right">Balance</th></tr></thead>
              <tbody>
                {data.accounts.map((a) => (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="py-1.5 pr-4 font-mono text-xs">{a.accountCode}</td>
                    <td className="py-1.5 pr-4">{a.accountName}</td>
                    <td className="py-1.5 pr-4"><Badge variant="outline" className="text-[10px]">{humanizeStatus(a.accountType)}</Badge></td>
                    <td className="py-1.5 pr-4 text-right tabular-nums">{a.debit > 0 ? a.debit.toFixed(2) : '—'}</td>
                    <td className="py-1.5 pr-4 text-right tabular-nums">{a.credit > 0 ? a.credit.toFixed(2) : '—'}</td>
                    <td className={cn('py-1.5 text-right tabular-nums font-medium', a.balance >= 0 ? 'text-emerald-600' : 'text-red-600')}>{a.balance.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="font-semibold"><td colSpan={3} className="py-2 pr-4">Totals</td><td className="py-2 pr-4 text-right tabular-nums">{data.totals.debit.toFixed(2)}</td><td className="py-2 pr-4 text-right tabular-nums">{data.totals.credit.toFixed(2)}</td><td className="py-2 text-right tabular-nums">{data.isBalanced ? '0.00' : (data.totals.debit - data.totals.credit).toFixed(2)}</td></tr></tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
