'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { TableToolbar } from '@/components/ui/table-toolbar';
import { Pagination } from '@/components/ui/pagination';
import { Plus, Eye, RotateCcw, Send } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { cn, formatDate, formatDateTime } from '@/lib/utils';
import { humanizeStatus } from '@/lib/status';
import { Paginated } from '@/lib/crm';
import { JournalEntryInfo } from '@/lib/accounting';

const PAGE_SIZE = 25;

const statusVariant: Record<string, string> = { DRAFT: 'secondary', PENDING_APPROVAL: 'warning', APPROVED: 'default', POSTED: 'success', REVERSED: 'destructive' };
const ALL = '__all__';
const J_TYPES = ['MANUAL', 'GENERAL', 'SALES', 'PURCHASE', 'PAYMENT', 'RECEIPT', 'EXPENSE', 'INVENTORY', 'PAYROLL', 'TAX', 'REVERSAL'];
const STATUSES = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'POSTED', 'REVERSED'];

export default function JournalsPage() {
  const { activeTenant } = useAuthStore();
  const [entries, setEntries] = useState<JournalEntryInfo[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<JournalEntryInfo | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(() => {
    if (!activeTenant) return;
    setLoading(true); setError('');
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));
    api.get<Paginated<JournalEntryInfo>>(`/api/v1/tenant/accounting/journals?${params.toString()}`, { tenantId: activeTenant.id })
      .then((res) => { setEntries(res.data); setMeta({ page: res.page, totalPages: res.totalPages, total: res.total }); })
      .catch((err) => setError(err.message || 'Failed to load journals'))
      .finally(() => setLoading(false));
  }, [activeTenant, search, status, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, status]);

  const viewDetail = async (id: string) => {
    if (!activeTenant) return;
    try { setDetail(await api.get<JournalEntryInfo>(`/api/v1/tenant/accounting/journals/${id}`, { tenantId: activeTenant.id })); } catch (err: any) { toast.error(err.message); }
  };

  const columns: DataTableColumn<JournalEntryInfo>[] = [
    { key: 'number', header: 'Journal #', cell: (j) => <button className="font-medium hover:underline text-left" onClick={() => viewDetail(j.id)}>{j.journalNumber ?? 'Draft'}</button> },
    { key: 'type', header: 'Type', hideOnMobile: true, cell: (j) => <Badge variant="outline" className="text-[10px]">{humanizeStatus(j.journalType)}</Badge> },
    { key: 'date', header: 'Entry date', hideOnMobile: true, cell: (j) => <span className="text-muted-foreground">{formatDate(j.entryDate)}</span> },
    { key: 'amount', header: 'Amount', align: 'right', cell: (j) => <span className="tabular-nums font-medium">{j.totalAmount != null ? `${j.totalAmount.toFixed(2)}` : '—'}</span> },
    { key: 'status', header: 'Status', cell: (j) => <Badge variant={(statusVariant[j.status] as any) || 'secondary'}>{humanizeStatus(j.status)}</Badge> },
    { key: 'source', header: 'Source', hideOnMobile: true, cell: (j) => <span className="text-xs text-muted-foreground">{j.sourceType ? `${humanizeStatus(j.sourceType)}${j.sourceNumber ? ` #${j.sourceNumber}` : ''}` : '—'}</span> },
    { key: 'actions', header: '', align: 'right', cell: (j) => <Button variant="ghost" size="icon" title="View" onClick={() => viewDetail(j.id)}><Eye className="h-4 w-4" /></Button> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Journal Entries" subtitle="Double-entry journal register" actions={
        <Button size="sm" onClick={() => setFormOpen(true)}><Plus className="mr-2 h-4 w-4" />Draft Entry</Button>
      } />

      <TableToolbar search={search} onSearchChange={setSearch} searchPlaceholder="Search journal number…" hasActiveFilters={status !== '' || search !== ''}
        onReset={() => { setSearch(''); setStatus(''); }}
        filters={<Select value={status || ALL} onValueChange={(v) => setStatus(v === ALL ? '' : v)}><SelectTrigger className="h-9 w-40"><SelectValue placeholder="All statuses" /></SelectTrigger><SelectContent><SelectItem value={ALL}>All statuses</SelectItem>{STATUSES.map(s => <SelectItem key={s} value={s}>{humanizeStatus(s)}</SelectItem>)}</SelectContent></Select>} />

      {error ? <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : (
        <>
          <DataTable columns={columns} data={entries} rowKey={(j) => j.id} loading={loading} emptyTitle="No journal entries found" emptyDescription={status || search ? 'Try adjusting your filters.' : 'No journal entries posted yet.'}
            mobileCard={(j) => (
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2"><span className="font-medium">{j.journalNumber ?? 'Draft'}</span><Badge variant={(statusVariant[j.status] as any) || 'secondary'}>{humanizeStatus(j.status)}</Badge></div>
                <p className="text-sm text-muted-foreground">{humanizeStatus(j.journalType)} · {j.totalAmount != null ? `${j.totalAmount.toFixed(2)}` : '—'} · {formatDate(j.entryDate)}</p>
              </div>
            )}
          />
          {!loading && entries.length > 0 && <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} limit={PAGE_SIZE} onPageChange={setPage} />}
        </>
      )}

      <JournalDetailDialog entry={detail} onOpenChange={(o) => !o && setDetail(null)} />
      <JournalFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={load} />
    </div>
  );
}

function JournalDetailDialog({ entry, onOpenChange }: { entry: JournalEntryInfo | null; onOpenChange: (o: boolean) => void }) {
  const { activeTenant } = useAuthStore();
  if (!entry) return null;
  return (
    <Dialog open={!!entry} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{entry.journalNumber ?? 'Draft entry'}</DialogTitle>
          <DialogDescription>
            <Badge variant={(statusVariant[entry.status] as any) || 'secondary'} className="mr-2">{humanizeStatus(entry.status)}</Badge>
            {humanizeStatus(entry.journalType)} · {formatDateTime(entry.entryDate)}
            {entry.postedAt && <> · posted {formatDateTime(entry.postedAt)}</>}
            {entry.accountingPeriod && <> · {entry.accountingPeriod.code}</>}
            {entry.reversalOf && <span className="ml-2 text-destructive">Reversed: {entry.reversalOf.journalNumber ?? entry.reversalOf.id}</span>}
          </DialogDescription>
        </DialogHeader>
        {entry.description && <p className="text-sm text-muted-foreground">{entry.description}</p>}
        <div className="space-y-1">
          {entry.items?.map((item) => (
            <div key={item.id} className="flex items-center justify-between border-b py-1 text-sm">
              <div className="min-w-0">
                <span className="font-mono text-xs">{item.account.accountCode}</span>
                <span className="ml-2 truncate text-muted-foreground">{item.account.accountName}</span>
                {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
              </div>
              <span className={cn('tabular-nums', item.debit > 0 ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium')}>
                {item.debit > 0 ? `+ ${Number(item.debit).toFixed(2)}` : `− ${Number(item.credit).toFixed(2)}`}
              </span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function JournalFormDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void }) {
  const { activeTenant } = useAuthStore();
  const [accounts, setAccounts] = useState<Array<{ value: string; label: string }>>([]);
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState([{ accountId: '', description: '', debit: '0', credit: '0' }, { accountId: '', description: '', debit: '0', credit: '0' }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && activeTenant) {
      api.get<any[]>('/api/v1/tenant/accounting/accounts?isActive=true', { tenantId: activeTenant.id })
        .then((res) => setAccounts(res.map((a: any) => ({ value: a.id, label: `${a.accountCode} — ${a.accountName}` }))))
        .catch(() => setAccounts([]));
    }
  }, [open, activeTenant]);

  const updateLine = (index: number, key: string, value: string) => {
    setLines((l) => l.map((line, i) => (i === index ? { ...line, [key]: value } : line)));
  };

  const addLine = () => setLines((l) => [...l, { accountId: '', description: '', debit: '0', credit: '0' }]);
  const removeLine = (index: number) => setLines((l) => l.filter((_, i) => i !== index));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant) return;
    for (const [i, l] of lines.entries()) {
      if (!l.accountId) { setError(`Line ${i + 1}: select an account`); return; }
      if (Number(l.debit) === 0 && Number(l.credit) === 0) { setError(`Line ${i + 1}: enter a debit or credit amount`); return; }
      if (Number(l.debit) > 0 && Number(l.credit) > 0) { setError(`Line ${i + 1}: enter either debit or credit, not both`); return; }
    }
    setSaving(true); setError('');
    try {
      await api.post('/api/v1/tenant/accounting/journals', {
        entryDate, description: description || undefined, journalType: 'MANUAL',
        lines: lines.map((l) => ({ accountId: l.accountId, description: l.description || undefined, debit: Number(l.debit), credit: Number(l.credit) })),
      }, { tenantId: activeTenant.id });
      toast.success('Draft journal created');
      onOpenChange(false);
      onSaved();
    } catch (err: any) { setError(err.message); toast.error(err.message); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Draft Journal Entry</DialogTitle><DialogDescription>Create a draft; approve and post it from the entry detail or the posting endpoint.</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Entry date<span className="text-destructive">*</span></Label><Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} required /></div>
            <div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          </div>
          <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_80px_80px_32px] items-end gap-1 rounded-md border p-2">
                <Select value={l.accountId} onValueChange={(v) => updateLine(i, 'accountId', v)}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Account" /></SelectTrigger><SelectContent>{accounts.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent></Select>
                <Input className="h-8 text-xs" placeholder="Line note" value={l.description} onChange={(e) => updateLine(i, 'description', e.target.value)} />
                <Input className="h-8 text-xs" type="number" min={0} step="0.01" placeholder="Dr" value={l.debit} onChange={(e) => updateLine(i, 'debit', e.target.value)} />
                <Input className="h-8 text-xs" type="number" min={0} step="0.01" placeholder="Cr" value={l.credit} onChange={(e) => updateLine(i, 'credit', e.target.value)} />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeLine(i)} disabled={lines.length <= 2}>✕</Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addLine}>+ Add line</Button>
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Create draft'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
