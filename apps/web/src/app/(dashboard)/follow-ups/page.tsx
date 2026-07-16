'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Plus, CheckCircle2, Trash2, AlertTriangle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { TableToolbar } from '@/components/ui/table-toolbar';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDateTime } from '@/lib/utils';
import { humanizeStatus } from '@/lib/status';
import { FollowUp, Paginated, FOLLOWUP_STATUSES } from '@/lib/crm';
import { FollowUpFormDialog } from './follow-up-form-dialog';

const ALL = '__all__';
const PAGE_SIZE = 25;

function isOverdue(fu: FollowUp) {
  return fu.status === 'PENDING' && new Date(fu.scheduledAt).getTime() < Date.now();
}

export default function FollowUpsPage() {
  const [items, setItems] = useState<FollowUp[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<FollowUp | null>(null);
  const { activeTenant, activeBranch } = useAuthStore();

  const load = useCallback(() => {
    if (!activeTenant) return;
    setLoading(true); setError('');
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));
    api.get<Paginated<FollowUp>>(`/api/v1/tenant/follow-ups?${params.toString()}`, { tenantId: activeTenant.id, branchId: activeBranch?.id })
      .then((res) => { setItems(res.data); setMeta({ page: res.page, totalPages: res.totalPages, total: res.total }); })
      .catch((err) => setError(err.message || 'Failed to load follow-ups'))
      .finally(() => setLoading(false));
  }, [activeTenant, activeBranch, status, search, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [status, search]);

  const handleComplete = async (fu: FollowUp) => {
    if (!activeTenant) return;
    try { await api.post(`/api/v1/tenant/follow-ups/${fu.id}/complete`, {}, { tenantId: activeTenant.id }); toast.success('Completed'); load(); }
    catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async () => {
    if (!activeTenant || !deleting) return;
    try { await api.delete(`/api/v1/tenant/follow-ups/${deleting.id}`, { tenantId: activeTenant.id }); toast.success('Deleted'); load(); }
    catch (err: any) { toast.error(err.message); }
  };

  const columns: DataTableColumn<FollowUp>[] = [
    { key: 'subject', header: 'Subject', cell: (fu) => <span className="font-medium">{fu.subject}</span> },
    {
      key: 'contact', header: 'Lead / Client', hideOnMobile: true,
      cell: (fu) => (
        fu.lead ? <Link href={`/leads/${fu.lead.id}`} className="text-primary hover:underline text-sm">{fu.lead.fullName}</Link>
        : fu.client ? <Link href={`/clients/${fu.client.id}`} className="text-primary hover:underline text-sm">{fu.client.displayName}</Link>
        : <span className="text-muted-foreground text-sm">—</span>
      ),
    },
    { key: 'channel', header: 'Channel', hideOnMobile: true, cell: (fu) => <span className="text-muted-foreground text-sm">{humanizeStatus(fu.channel)}</span> },
    {
      key: 'scheduled', header: 'Scheduled', hideOnMobile: true,
      cell: (fu) => (
        isOverdue(fu)
          ? <span className="flex items-center gap-1.5 text-sm font-medium text-destructive"><AlertTriangle className="h-3.5 w-3.5" />{formatDateTime(fu.scheduledAt)}<Badge variant="destructive" className="text-[10px]">Overdue</Badge></span>
          : <span className="text-muted-foreground text-sm">{formatDateTime(fu.scheduledAt)}</span>
      ),
    },
    { key: 'status', header: 'Status', cell: (fu) => <StatusBadge status={fu.status} /> },
    {
      key: 'actions', header: '', align: 'right',
      cell: (fu) => (
        <div className="flex items-center justify-end gap-1">
          {fu.status === 'PENDING' && <Button variant="ghost" size="icon" title="Mark complete" onClick={() => handleComplete(fu)}><CheckCircle2 className="h-4 w-4 text-success" /></Button>}
          <Button variant="ghost" size="icon" title="Delete" onClick={() => setDeleting(fu)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Follow-ups" subtitle="Schedule and track follow-up activities for leads and clients" actions={<Button size="sm" onClick={() => setFormOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Follow-up</Button>} />

      <TableToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search subjects..."
        hasActiveFilters={status !== '' || search !== ''}
        onReset={() => { setStatus(''); setSearch(''); }}
        filters={
          <Select value={status || ALL} onValueChange={(v) => setStatus(v === ALL ? '' : v)}>
            <SelectTrigger className="h-9 w-44"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>{FOLLOWUP_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
          </Select>
        }
      />

      {error ? <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : (
        <>
          <DataTable columns={columns} data={items} rowKey={fu => fu.id} loading={loading} emptyTitle="No follow-ups found" emptyDescription={status || search ? 'Try adjusting your filters.' : 'Schedule a follow-up to stay on top of client activity.'}
            emptyAction={!status && !search ? <Button size="sm" variant="outline" onClick={() => setFormOpen(true)}><Plus className="mr-2 h-4 w-4" />Schedule a follow-up</Button> : undefined}
            mobileCard={(fu) => (
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2"><span className="font-medium">{fu.subject}</span><div className="flex items-center gap-1">{isOverdue(fu) && <Badge variant="destructive" className="text-[10px]">Overdue</Badge>}<StatusBadge status={fu.status} /></div></div>
                {fu.lead && <p className="text-sm text-primary">Lead: {fu.lead.fullName}</p>}
                {fu.client && <p className="text-sm text-primary">Client: {fu.client.displayName}</p>}
                <p className={isOverdue(fu) ? 'text-sm font-medium text-destructive' : 'text-sm text-muted-foreground'}>{humanizeStatus(fu.channel)} · {formatDateTime(fu.scheduledAt)}</p>
              </div>
            )}
          />
          {!loading && items.length > 0 && <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} limit={PAGE_SIZE} onPageChange={setPage} />}
        </>
      )}

      <FollowUpFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={load} />
      <ConfirmDialog open={!!deleting} onOpenChange={o => !o && setDeleting(null)} title="Delete follow-up?" description={`Remove "${deleting?.subject}"?`} confirmLabel="Delete" onConfirm={handleDelete} />
    </div>
  );
}
