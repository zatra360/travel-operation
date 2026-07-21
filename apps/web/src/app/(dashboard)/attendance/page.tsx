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
import { Attendance, Paginated, ATTENDANCE_STATUSES } from '@/lib/crm';
import { AttendanceFormDialog } from './attendance-form-dialog';

const ALL = '__all__';
const PAGE_SIZE = 25;

function clockRange(a: Attendance): string {
  const parts = [a.clockIn && formatDate(a.clockIn), a.clockOut && formatDate(a.clockOut)].filter(Boolean);
  return parts.length ? parts.join(' – ') : '—';
}

export default function AttendancePage() {
  const [items, setItems] = useState<Attendance[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Attendance | null>(null);
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
      .get<Paginated<Attendance>>(`/api/v1/tenant/attendance?${params.toString()}`, {
        tenantId: activeTenant.id,
        branchId: activeBranch?.id,
      })
      .then((r) => {
        setItems(r.data);
        setMeta({ page: r.page, totalPages: r.totalPages, total: r.total });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [activeTenant, activeBranch, status, page]);

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
  const openEdit = (a: Attendance) => { setEditing(a); setFormOpen(true); };
  const [deleting, setDeleting] = useState<Attendance | null>(null);
  const handleDelete = async () => {
    if (!activeTenant || !deleting) return;
    try { await api.delete(`/api/v1/tenant/attendance/${deleting.id}`, { tenantId: activeTenant.id }); toast.success('Deleted'); setDeleting(null); load(); } catch (err: any) { toast.error(err.message); }
  };

  const columns: DataTableColumn<Attendance>[] = [
    { key: 'employee', header: 'Employee', cell: (a) => <span className="font-medium">{a.employee?.firstName} {a.employee?.lastName}</span> },
    { key: 'date', header: 'Date', cell: (a) => <span className="text-muted-foreground">{formatDate(a.date)}</span> },
    { key: 'status', header: 'Status', cell: (a) => <StatusBadge status={a.status} /> },
    { key: 'clock', header: 'Clock in/out', hideOnMobile: true, cell: (a) => <span className="text-muted-foreground">{clockRange(a)}</span> },
    { key: 'actions', header: '', align: 'right', cell: (a) => (<div className="flex items-center justify-end gap-1"><Button variant="ghost" size="icon" onClick={() => openEdit(a)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => setDeleting(a)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>) },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Attendance"
        subtitle="Record daily attendance and time tracking"
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Mark Attendance
          </Button>
        }
      />

      <TableToolbar
        hasActiveFilters={status !== ''}
        onReset={() => setStatus('')}
        filters={
          <Select value={status || ALL} onValueChange={(v) => setStatus(v === ALL ? '' : v)}>
            <SelectTrigger className="h-9 w-40" aria-label="Filter by status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {ATTENDANCE_STATUSES.map((s) => (
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
            rowKey={(a) => a.id}
            loading={loading}
            emptyTitle="No attendance records"
            emptyDescription={status ? 'Try a different status filter.' : 'Mark attendance to start tracking time.'}
            emptyAction={
              !status ? (
                <Button size="sm" variant="outline" onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Mark attendance
                </Button>
              ) : undefined
            }
            mobileCard={(a) => (
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">
                    {a.employee?.firstName} {a.employee?.lastName}
                  </span>
                  <StatusBadge status={a.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatDate(a.date)} · {clockRange(a)}
                </p>
              </div>
            )}
          />
          {!loading && items.length > 0 && (
            <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} limit={PAGE_SIZE} onPageChange={setPage} />
          )}
        </>
      )}

      <AttendanceFormDialog open={formOpen} onOpenChange={setFormOpen} attendance={editing} onSaved={load} />
      <ConfirmDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} title="Delete record?" description="Remove this attendance record? This cannot be undone." confirmLabel="Delete" onConfirm={handleDelete} />
    </div>
  );
}
