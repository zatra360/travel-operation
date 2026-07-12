'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
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
import { Employee, Paginated, EMPLOYEE_STATUSES } from '@/lib/crm';
import { EmployeeFormDialog } from './employee-form-dialog';

const ALL = '__all__';
const PAGE_SIZE = 25;

export default function EmployeesPage() {
  const [items, setItems] = useState<Employee[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState<Employee | null>(null);
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
      .get<Paginated<Employee>>(`/api/v1/tenant/employees?${params.toString()}`, {
        tenantId: activeTenant.id,
        branchId: activeBranch?.id,
      })
      .then((r) => {
        setItems(r.data);
        setMeta({ page: r.page, totalPages: r.totalPages, total: r.total });
      })
      .catch((e) => setError(e.message || 'Failed'))
      .finally(() => setLoading(false));
  }, [activeTenant, activeBranch, search, status, page]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    setPage(1);
  }, [search, status]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (e: Employee) => {
    setEditing(e);
    setFormOpen(true);
  };
  const handleDelete = async () => {
    if (!activeTenant || !deleting) return;
    try {
      await api.delete(`/api/v1/tenant/employees/${deleting.id}`, { tenantId: activeTenant.id });
      toast.success('Employee deleted');
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const hasFilters = search !== '' || status !== '';

  const columns: DataTableColumn<Employee>[] = [
    { key: 'code', header: 'Code', cell: (e) => <span className="font-medium">{e.employeeCode}</span> },
    {
      key: 'name',
      header: 'Name',
      cell: (e) => (
        <Link href={`/employees/${e.id}`} className="font-medium text-primary hover:underline">
          {e.firstName} {e.lastName}
        </Link>
      ),
    },
    { key: 'position', header: 'Position', hideOnMobile: true, cell: (e) => <span className="text-muted-foreground">{e.position || '—'}</span> },
    { key: 'status', header: 'Status', cell: (e) => <StatusBadge status={e.status} /> },
    { key: 'joined', header: 'Joined', hideOnMobile: true, cell: (e) => <span className="text-muted-foreground">{e.joinedAt ? formatDate(e.joinedAt) : '—'}</span> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (e) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(e)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Delete" onClick={() => setDeleting(e)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Employees"
        subtitle="Manage staff, departments, attendance and payroll"
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        }
      />

      <TableToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name, code, email…"
        hasActiveFilters={hasFilters}
        onReset={() => {
          setSearch('');
          setStatus('');
        }}
        filters={
          <Select value={status || ALL} onValueChange={(v) => setStatus(v === ALL ? '' : v)}>
            <SelectTrigger className="h-9 w-40" aria-label="Filter by status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {EMPLOYEE_STATUSES.map((s) => (
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
            rowKey={(e) => e.id}
            loading={loading}
            emptyTitle="No employees found"
            emptyDescription={hasFilters ? 'Try adjusting your filters.' : 'Add your first employee to get started.'}
            emptyAction={
              !hasFilters ? (
                <Button size="sm" variant="outline" onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add your first employee
                </Button>
              ) : undefined
            }
            mobileCard={(e) => (
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/employees/${e.id}`} className="font-medium text-primary hover:underline">
                    {e.firstName} {e.lastName}
                  </Link>
                  <StatusBadge status={e.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {e.employeeCode} · {e.position || '—'}
                </p>
              </div>
            )}
          />
          {!loading && items.length > 0 && (
            <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} limit={PAGE_SIZE} onPageChange={setPage} />
          )}
        </>
      )}

      <EmployeeFormDialog open={formOpen} onOpenChange={setFormOpen} employee={editing} onSaved={load} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete employee?"
        description={`Delete ${deleting?.firstName} ${deleting?.lastName}?`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}
