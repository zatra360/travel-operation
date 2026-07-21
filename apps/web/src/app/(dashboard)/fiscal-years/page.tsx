'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/page-header';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { CalendarPlus, RotateCcw } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { cn, formatDate } from '@/lib/utils';
import { humanizeStatus } from '@/lib/status';
import { FiscalYearInfo } from '@/lib/accounting';

const periodVariant: Record<string, string> = { OPEN: 'default', SOFT_CLOSED: 'secondary', CLOSED: 'warning', LOCKED: 'destructive' };

export default function FiscalYearsPage() {
  const { activeTenant } = useAuthStore();
  const [years, setYears] = useState<FiscalYearInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [code, setCode] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    if (!activeTenant) return;
    api.get<FiscalYearInfo[]>('/api/v1/tenant/accounting/fiscal-years', { tenantId: activeTenant.id })
      .then(setYears)
      .catch((err) => toast.error(err.message || 'Failed to load fiscal years'))
      .finally(() => setLoading(false));
  }, [activeTenant]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!activeTenant) return;
    setSaving(true);
    try {
      await api.post('/api/v1/tenant/accounting/fiscal-years', { code, startDate, endDate }, { tenantId: activeTenant.id });
      toast.success('Fiscal year created');
      setAddOpen(false);
      setCode(''); setStartDate(''); setEndDate('');
      load();
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-72" /></div>;

  return (
    <div className="space-y-5">
      <PageHeader title="Fiscal Years & Periods" subtitle="Accounting calendar; closed periods block posting" actions={
        <Button size="sm" onClick={() => setAddOpen(true)}><CalendarPlus className="mr-2 h-4 w-4" />New Fiscal Year</Button>
      } />

      {years.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No fiscal years exist. Create one to enable double-entry posting and period close.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {years.map((fy) => (
            <Card key={fy.id}>
              <CardHeader>
                <CardTitle className="text-base">{fy.code}</CardTitle>
                <p className="text-sm text-muted-foreground">{formatDate(fy.startDate)} — {formatDate(fy.endDate)}</p>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {fy.periods.map((p) => <PeriodCard key={p.id} period={p} onChanged={load} />)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New Fiscal Year</DialogTitle><DialogDescription>Monthly periods are auto-generated from the date range.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Code<span className="text-destructive">*</span></Label><Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="FY2026" /></div>
            <div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Start<span className="text-destructive">*</span></Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
            <div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">End<span className="text-destructive">*</span></Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>Cancel</Button><Button onClick={create} disabled={saving}>{saving ? 'Creating…' : 'Create'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PeriodCard({ period, onChanged }: { period: { id: string; code: string; periodNumber: number; startDate: string; endDate: string; status: string }; onChanged: () => void }) {
  const { activeTenant } = useAuthStore();
  const [closing, setClosing] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [reason, setReason] = useState('');

  const act = async (url: string, payload: any, label: string) => {
    try {
      await api.post(`/api/v1/tenant/accounting${url}`, payload, { tenantId: activeTenant!.id });
      toast.success(label);
      onChanged();
    } catch (err: any) { toast.error(err.message); throw err; }
  };

  return (
    <div className={cn('rounded-md border p-3', period.status === 'LOCKED' && 'opacity-60')}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-sm font-medium">{period.code}</span>
        <Badge variant={(periodVariant[period.status] as any) || 'secondary'} className="text-[10px]">{humanizeStatus(period.status)}</Badge>
      </div>
      <p className="text-xs text-muted-foreground mb-2">{formatDate(period.startDate)} — {formatDate(period.endDate)}</p>
      <div className="flex gap-1">
        {period.status === 'OPEN' && (<>
          <Button size="sm" variant="outline" onClick={() => setClosing(true)}>Close</Button>
          <ConfirmDialog open={closing} onOpenChange={(o) => { setClosing(o); if (!o) setReason(''); }} title={`Close ${period.code}?`} description="Closed periods block new postings." confirmLabel="Close" destructive={false}
            onConfirm={() => act(`/periods/${period.id}/close`, { action: 'CLOSE', reason: reason || undefined }, `${period.code} closed`)} />
          {closing && <Input className="w-48 h-8 text-xs" placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />}
        </>)}
        {(period.status === 'CLOSED' || period.status === 'SOFT_CLOSED') && (<>
          <Button size="sm" variant="outline" onClick={() => setReopening(true)}><RotateCcw className="mr-1 h-3 w-3" />Reopen</Button>
          <ConfirmDialog open={reopening} onOpenChange={(o) => { setReopening(o); if (!o) setReason(''); }} title={`Reopen ${period.code}?`} description="Requires a reason and will be audited." confirmLabel="Reopen" destructive={false}
            onConfirm={() => act(`/periods/${period.id}/reopen`, { reason: reason || 'Reopened from UI' }, `${period.code} reopened`)} />
          {reopening && <Input className="w-48 h-8 text-xs" placeholder="Reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} />}
        </>)}
      </div>
    </div>
  );
}
