'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
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
import { formatDate } from '@/lib/utils';
import { Leave, Paginated, LEAVE_STATUSES } from '@/lib/crm';
import { LeaveFormDialog } from './leave-form-dialog';

const ALL = '__all__';
const PAGE_SIZE = 25;

export default function LeavesPage() {
  const [items, setItems] = useState<Leave[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Leave | null>(null);
  const { activeTenant, activeBranch } = useAuthStore();

  const load = useCallback(() => {
    if (!activeTenant) return;
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));
    api
      .get<Paginated<Leave>>(`/api/v1/tenant/leaves?${params.toString()}`, {
        tenantId: activeTenant.id,
        branchId: activeBranch?.id,
      })
      .then((r) => {
        setItems(r.data);
        setMeta({ page: r.page, totalPages: r.totalPages, total: r.total });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [activeTenant, activeBranch, search, status, page]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    setPage(1);
  }, [status]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (l: Leave) => { setEditing(l); setFormOpen(true); };
  const [deleting, setDeleting] = useState<Leave | null>(null);
  const handleDelete = async () => { if (!activeTenant || !deleting) return; try { await api.delete(`/api/v1/tenant/leaves/${deleting.id}`, { tenantId: activeTenant.id }); toast.success('Deleted'); setDeleting(null); load(); } catch (err: any) { toast.error(err.message); } };
  const hasFilters = search !== '' || status !== '';

  const columns: DataTableColumn<Leave>[] = [
    { key: 'employee', header: 'Employee', cell: (l) => <span className="font-medium">{l.employee?.firstName} {l.employee?.lastName}</span> },
    { key: 'type', header: 'Type', cell: (l) => <span className="text-muted-foreground">{l.leaveType}</span> },
    { key: 'dates', header: 'Dates', hideOnMobile: true, cell: (l) => <span className="text-muted-foreground">{formatDate(l.startDate)} – {formatDate(l.endDate)}</span> },
    { key: 'status', header: 'Status', cell: (l) => <StatusBadge status={l.status} /> },
    { key: 'reason', header: 'Reason', hideOnMobile: true, cell: (l) => <span className="text-muted-foreground">{l.reason || '—'}</span> },
    { key: 'actions', header: '', align: 'right', cell: (l) => (<div className="flex items-center justify-end gap-1"><Button variant="ghost" size="icon" onClick={() => openEdit(l)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => setDeleting(l)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>) },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Leave Requests"
        subtitle="Track employee leave requests and approvals"
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </Button>
        }
      />

      <TableToolbar
        search={search} onSearchChange={setSearch} searchPlaceholder="Search leaves…"
        hasActiveFilters={hasFilters}
        onReset={() => { setSearch(''); setStatus(''); }}
        filters={
          <Select value={status || ALL} onValueChange={(v) => setStatus(v === ALL ? '' : v)}>
            <SelectTrigger className="h-9 w-40" aria-label="Filter by status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {LEAVE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' ')}
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
            rowKey={(l) => l.id}
            loading={loading}
            emptyTitle="No leave requests"
            emptyDescription={status ? 'Try a different status filter.' : 'Submit a leave request to get started.'}
            emptyAction={
              !status ? (
                <Button size="sm" variant="outline" onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  New request
                </Button>
              ) : undefined
            }
            mobileCard={(l) => (
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">
                    {l.employee?.firstName} {l.employee?.lastName}
                  </span>
                  <StatusBadge status={l.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {l.leaveType} · {formatDate(l.startDate)} – {formatDate(l.endDate)}
                </p>
              </div>
            )}
          />
          {!loading && items.length > 0 && (
            <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} limit={PAGE_SIZE} onPageChange={setPage} />
          )}
        </>
      )}

      <LeaveFormDialog open={formOpen} onOpenChange={setFormOpen} leave={editing} onSaved={load} />
      <ConfirmDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} title="Delete leave?" description={`Remove this leave request?`} confirmLabel="Delete" onConfirm={handleDelete} />
    </div>
  );
}
