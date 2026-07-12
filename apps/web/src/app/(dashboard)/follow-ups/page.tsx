'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Plus, CheckCircle2, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { TableToolbar } from '@/components/ui/table-toolbar';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDateTime } from '@/lib/utils';
import { FollowUp, Paginated, FOLLOWUP_STATUSES } from '@/lib/crm';
import { FollowUpFormDialog } from './follow-up-form-dialog';

const ALL = '__all__';
const PAGE_SIZE = 25;

export default function FollowUpsPage() {
  const [items, setItems] = useState<FollowUp[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<FollowUp | null>(null);
  const { activeTenant, activeBranch } = useAuthStore();

  const load = useCallback(() => {
    if (!activeTenant) return;
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));
    api
      .get<Paginated<FollowUp>>(`/api/v1/tenant/follow-ups?${params.toString()}`, {
        tenantId: activeTenant.id,
        branchId: activeBranch?.id,
      })
      .then((res) => {
        setItems(res.data);
        setMeta({ page: res.page, totalPages: res.totalPages, total: res.total });
      })
      .catch((err) => setError(err.message || 'Failed to load follow-ups'))
      .finally(() => setLoading(false));
  }, [activeTenant, activeBranch, status, page]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    setPage(1);
  }, [status]);

  const handleComplete = async (fu: FollowUp) => {
    if (!activeTenant) return;
    try {
      await api.post(`/api/v1/tenant/follow-ups/${fu.id}/complete`, {}, { tenantId: activeTenant.id });
      toast.success('Follow-up completed');
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete follow-up');
    }
  };

  const handleDelete = async () => {
    if (!activeTenant || !deleting) return;
    try {
      await api.delete(`/api/v1/tenant/follow-ups/${deleting.id}`, { tenantId: activeTenant.id });
      toast.success('Follow-up deleted');
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete follow-up');
    }
  };

  const columns: DataTableColumn<FollowUp>[] = [
    { key: 'subject', header: 'Subject', cell: (fu) => <span className="font-medium">{fu.subject}</span> },
    { key: 'channel', header: 'Channel', hideOnMobile: true, cell: (fu) => <span className="text-muted-foreground">{fu.channel}</span> },
    { key: 'scheduled', header: 'Scheduled', hideOnMobile: true, cell: (fu) => <span className="text-muted-foreground">{formatDateTime(fu.scheduledAt)}</span> },
    { key: 'status', header: 'Status', cell: (fu) => <StatusBadge status={fu.status} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (fu) => (
        <div className="flex items-center justify-end gap-1">
          {fu.status === 'PENDING' && (
            <Button variant="ghost" size="icon" title="Mark complete" onClick={() => handleComplete(fu)}>
              <CheckCircle2 className="h-4 w-4 text-success" />
            </Button>
          )}
          <Button variant="ghost" size="icon" title="Delete" onClick={() => setDeleting(fu)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Follow-ups"
        subtitle="Schedule and track client follow-up activities"
        actions={
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Follow-up
          </Button>
        }
      />

      <TableToolbar
        hasActiveFilters={status !== ''}
        onReset={() => setStatus('')}
        filters={
          <Select value={status || ALL} onValueChange={(v) => setStatus(v === ALL ? '' : v)}>
            <SelectTrigger className="h-9 w-44" aria-label="Filter by status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {FOLLOWUP_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {error ? (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={items}
            rowKey={(fu) => fu.id}
            loading={loading}
            emptyTitle="No follow-ups found"
            emptyDescription={status ? 'Try a different status filter.' : 'Schedule a follow-up to stay on top of client activity.'}
            emptyAction={
              !status ? (
                <Button size="sm" variant="outline" onClick={() => setFormOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Schedule a follow-up
                </Button>
              ) : undefined
            }
            mobileCard={(fu) => (
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{fu.subject}</span>
                  <StatusBadge status={fu.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {fu.channel} · {formatDateTime(fu.scheduledAt)}
                </p>
              </div>
            )}
          />
          {!loading && items.length > 0 && (
            <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} limit={PAGE_SIZE} onPageChange={setPage} />
          )}
        </>
      )}

      <FollowUpFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={load} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete follow-up?"
        description={`This will remove "${deleting?.subject}". This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}
