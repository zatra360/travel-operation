'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Plus, Pencil, Trash2, Eye, FolderKanban } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { TableToolbar } from '@/components/ui/table-toolbar';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate, formatMoney } from '@/lib/utils';
import { Project, Paginated, PROJECT_STATUSES } from '@/lib/crm';
import { ProjectFormDialog } from './project-form-dialog';

const ALL = '__all__';
const PAGE_SIZE = 25;

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);
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
    api.get<Paginated<Project>>(`/api/v1/tenant/projects?${params.toString()}`, { tenantId: activeTenant.id, branchId: activeBranch?.id })
      .then((res) => { setProjects(res.data); setMeta({ page: res.page, totalPages: res.totalPages, total: res.total }); })
      .catch((err) => setError(err.message || 'Failed to load projects'))
      .finally(() => setLoading(false));
  }, [activeTenant, activeBranch, search, status, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, status]);

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (p: Project) => { setEditing(p); setFormOpen(true); };

  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('new') === '1') {
      openCreate();
      window.history.replaceState({}, '', '/projects');
    }
  }, []);

  const handleDelete = async () => {
    if (!activeTenant || !deleting) return;
    try {
      await api.delete(`/api/v1/tenant/projects/${deleting.id}`, { tenantId: activeTenant.id });
      toast.success('Project deleted');
      load();
    } catch (err: any) { toast.error(err.message || 'Failed to delete project'); }
  };

  const hasFilters = search !== '' || status !== '';

  const columns: DataTableColumn<Project>[] = [
    {
      key: 'name',
      header: 'Project',
      cell: (p) => (
        <Link href={`/projects/${p.id}`} className="font-medium hover:underline flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-muted-foreground" />
          {p.name}
        </Link>
      ),
    },
    { key: 'projectNumber', header: 'Ref', hideOnMobile: true, cell: (p) => <span className="text-muted-foreground text-xs">{p.projectNumber}</span> },
    { key: 'status', header: 'Status', cell: (p) => <StatusBadge status={p.status} /> },
    { key: 'priority', header: 'Priority', hideOnMobile: true, cell: (p) => <StatusBadge status={p.priority} kind="priority" /> },
    {
      key: 'manager',
      header: 'Manager',
      hideOnMobile: true,
      cell: (p) => (
        <span className="text-muted-foreground text-sm">
          {p.assignedTo ? `${p.assignedTo.firstName} ${p.assignedTo.lastName}` : '—'}
        </span>
      ),
    },
    {
      key: 'tasks',
      header: 'Tasks',
      hideOnMobile: true,
      cell: (p) => <span className="text-muted-foreground text-sm">{p._count?.tasks ?? 0}</span>,
    },
    {
      key: 'budget',
      header: 'Budget',
      hideOnMobile: true,
      cell: (p) => <span className="text-muted-foreground text-sm">{formatMoney(p.budget, p.currencyCode)}</span>,
    },
    {
      key: 'cost',
      header: 'Cost',
      hideOnMobile: true,
      cell: (p) => {
        const budget = Number(p.budget);
        const cost = Number(p.actualCost);
        const pct = budget > 0 ? Math.round((cost / budget) * 100) : 0;
        const color = pct > 90 ? 'text-destructive' : pct > 75 ? 'text-yellow-600' : 'text-muted-foreground';
        return <span className={`text-sm ${color}`}>{formatMoney(cost, p.currencyCode)} ({pct}%)</span>;
      },
    },
    {
      key: 'created',
      header: 'Created',
      hideOnMobile: true,
      cell: (p) => <span className="text-muted-foreground text-sm">{formatDate(p.createdAt)}</span>,
    },
    {
      key: 'actions', header: '', align: 'right',
      cell: (p) => (
        <div className="flex items-center justify-end gap-1">
          <Button asChild variant="ghost" size="icon" title="View"><Link href={`/projects/${p.id}`}><Eye className="h-4 w-4" /></Link></Button>
          <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" title="Delete" onClick={() => setDeleting(p)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Projects"
        subtitle="Manage projects, track tasks, and log time"
        actions={<Button size="sm" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Project</Button>}
      />
      <TableToolbar
        search={search} onSearchChange={setSearch} searchPlaceholder="Search projects…"
        hasActiveFilters={hasFilters}
        onReset={() => { setSearch(''); setStatus(''); }}
        filters={
          <Select value={status || ALL} onValueChange={(v) => setStatus(v === ALL ? '' : v)}>
            <SelectTrigger className="h-9 w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {PROJECT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
        }
      />
      {error ? (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      ) : (
        <>
          <DataTable columns={columns} data={projects} rowKey={(p) => p.id} loading={loading}
            emptyTitle="No projects found"
            emptyDescription={hasFilters ? 'Try adjusting your filters.' : 'Create your first project to get started.'}
            emptyAction={!hasFilters ? <Button size="sm" variant="outline" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Create your first project</Button> : undefined}
            mobileCard={(p) => (
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <button className="font-medium hover:underline flex items-center gap-2" onClick={() => router.push(`/projects/${p.id}`)}>
                    <FolderKanban className="h-4 w-4 text-muted-foreground" />{p.name}
                  </button>
                  <StatusBadge status={p.status} />
                </div>
                <p className="text-xs text-muted-foreground">{p.projectNumber} · {p._count?.tasks ?? 0} tasks</p>
              </div>
            )}
          />
          {!loading && projects.length > 0 && <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} limit={PAGE_SIZE} onPageChange={setPage} />}
        </>
      )}
      <ProjectFormDialog open={formOpen} onOpenChange={setFormOpen} project={editing} onSaved={load} />
      <ConfirmDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} title="Delete project?" description={`This will remove ${deleting?.name}. This action cannot be undone.`} confirmLabel="Delete" onConfirm={handleDelete} />
    </div>
  );
}
