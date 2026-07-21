'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { TableToolbar } from '@/components/ui/table-toolbar';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/lib/utils';
import { TaskItem, Paginated, TASK_STATUSES } from '@/lib/crm';
import { FolderKanban, Eye } from 'lucide-react';

const ALL = '__all__';
const PAGE_SIZE = 25;

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const { activeTenant, user } = useAuthStore();

  const load = useCallback(() => {
    if (!activeTenant) return;
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));
    api.get<Paginated<TaskItem>>(`/api/v1/tenant/projects/my/tasks?${params.toString()}`, { tenantId: activeTenant.id })
      .then((res) => { setTasks(res.data); setMeta({ page: res.page, totalPages: res.totalPages, total: res.total }); })
      .catch((err) => setError(err.message || 'Failed to load tasks'))
      .finally(() => setLoading(false));
  }, [activeTenant, search, status, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, status]);

  const hasFilters = search !== '' || status !== '';

  const columns: DataTableColumn<TaskItem>[] = [
    {
      key: 'title',
      header: 'Task',
      cell: (t) => (
        <div>
          <span className="font-medium">{t.title}</span>
          {t.project && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><FolderKanban className="h-3 w-3" />{t.project.name}</p>}
        </div>
      ),
    },
    { key: 'status', header: 'Status', cell: (t) => <StatusBadge status={t.status} /> },
    { key: 'priority', header: 'Priority', hideOnMobile: true, cell: (t) => <StatusBadge status={t.priority} kind="priority" /> },
    {
      key: 'due',
      header: 'Due Date',
      hideOnMobile: true,
      cell: (t) => <span className="text-muted-foreground text-sm">{t.dueDate ? formatDate(t.dueDate) : '—'}</span>,
    },
    {
      key: 'project',
      header: 'Project',
      hideOnMobile: true,
      cell: (t) => t.project ? <span className="text-muted-foreground text-sm">{t.project.name}</span> : <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (t) => (
        <Button asChild variant="ghost" size="icon" title="View in project">
          <Link href={t.project ? `/projects/${t.project.id}` : '#'}>
            <Eye className="h-4 w-4" />
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="My Tasks" subtitle="Tasks assigned to you across all projects" />
      <TableToolbar
        search={search} onSearchChange={setSearch} searchPlaceholder="Search tasks…"
        hasActiveFilters={hasFilters}
        onReset={() => { setSearch(''); setStatus(''); }}
        filters={
          <Select value={status || ALL} onValueChange={(v) => setStatus(v === ALL ? '' : v)}>
            <SelectTrigger className="h-9 w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {TASK_STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
        }
      />
      {error ? (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      ) : (
        <>
          <DataTable columns={columns} data={tasks} rowKey={(t) => t.id} loading={loading}
            emptyTitle="No tasks assigned"
            emptyDescription={hasFilters ? 'Try adjusting your filters.' : 'You have no tasks assigned yet.'}
            mobileCard={(t) => (
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{t.title}</span>
                  <StatusBadge status={t.status} />
                </div>
                {t.project && <p className="text-xs text-muted-foreground">{t.project.name}</p>}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <StatusBadge status={t.priority} kind="priority" />
                  {t.dueDate && <span>{formatDate(t.dueDate)}</span>}
                </div>
              </div>
            )}
          />
          {!loading && tasks.length > 0 && <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} limit={PAGE_SIZE} onPageChange={setPage} />}
        </>
      )}
    </div>
  );
}
