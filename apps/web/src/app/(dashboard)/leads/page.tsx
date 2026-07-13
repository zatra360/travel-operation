'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Plus, Pencil, Trash2, UserCheck, Eye } from 'lucide-react';
import { ImportExportButtons } from '@/components/import-export-buttons';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { TableToolbar } from '@/components/ui/table-toolbar';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/lib/utils';
import { Lead, Paginated, LEAD_STATUSES } from '@/lib/crm';
import { LeadFormDialog } from './lead-form-dialog';

const ALL = '__all__';
const PAGE_SIZE = 25;

export default function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [deleting, setDeleting] = useState<Lead | null>(null);
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
      .get<Paginated<Lead>>(`/api/v1/tenant/leads?${params.toString()}`, {
        tenantId: activeTenant.id,
        branchId: activeBranch?.id,
      })
      .then((res) => {
        setLeads(res.data);
        setMeta({ page: res.page, totalPages: res.totalPages, total: res.total });
      })
      .catch((err) => setError(err.message || 'Failed to load leads'))
      .finally(() => setLoading(false));
  }, [activeTenant, activeBranch, search, status, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Reset to first page when filters change.
  useEffect(() => {
    setPage(1);
  }, [search, status]);

  const openCreate = useCallback(() => {
    setEditing(null);
    setFormOpen(true);
  }, []);

  // Support the topbar quick-create deep link (/leads?new=1).
  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('new') === '1') {
      openCreate();
      window.history.replaceState({}, '', '/leads');
    }
  }, [openCreate]);

  const openEdit = (lead: Lead) => {
    setEditing(lead);
    setFormOpen(true);
  };

  const handleConvert = async (lead: Lead) => {
    if (!activeTenant) return;
    try {
      await api.post(`/api/v1/tenant/leads/${lead.id}/convert`, {}, { tenantId: activeTenant.id });
      toast.success(`${lead.fullName} converted to client`);
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to convert lead');
    }
  };

  const handleDelete = async () => {
    if (!activeTenant || !deleting) return;
    try {
      await api.delete(`/api/v1/tenant/leads/${deleting.id}`, { tenantId: activeTenant.id });
      toast.success('Lead deleted');
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete lead');
    }
  };

  const hasFilters = search !== '' || status !== '';

  const columns: DataTableColumn<Lead>[] = [
    {
      key: 'name',
      header: 'Name',
      cell: (lead) => (
        <Link href={`/leads/${lead.id}`} className="font-medium hover:underline">
          {lead.fullName}
        </Link>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      hideOnMobile: true,
      cell: (lead) => <span className="text-muted-foreground">{lead.email || lead.phone || '—'}</span>,
    },
    { key: 'status', header: 'Status', cell: (lead) => <StatusBadge status={lead.status} /> },
    {
      key: 'priority',
      header: 'Priority',
      hideOnMobile: true,
      cell: (lead) => <StatusBadge status={lead.priority} kind="priority" />,
    },
    {
      key: 'service',
      header: 'Service',
      hideOnMobile: true,
      cell: (lead) => <span className="text-muted-foreground">{lead.serviceType || '—'}</span>,
    },
    {
      key: 'created',
      header: 'Created',
      hideOnMobile: true,
      cell: (lead) => <span className="text-muted-foreground">{formatDate(lead.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (lead) => (
        <div className="flex items-center justify-end gap-1">
          <Button asChild variant="ghost" size="icon" title="View">
            <Link href={`/leads/${lead.id}`}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(lead)}>
            <Pencil className="h-4 w-4" />
          </Button>
          {lead.status !== 'WON' && (
            <Button variant="ghost" size="icon" title="Convert to client" onClick={() => handleConvert(lead)}>
              <UserCheck className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" title="Delete" onClick={() => setDeleting(lead)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Leads"
        subtitle="Manage leads, track follow-ups, and convert to clients"
        actions={
          <div className="flex items-center gap-2">
            <ImportExportButtons type="leads" onImported={load} />
            <Button size="sm" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Lead</Button>
          </div>
        }
      />

      <TableToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name, email, or phone…"
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
              {LEAD_STATUSES.map((s) => (
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
            data={leads}
            rowKey={(l) => l.id}
            loading={loading}
            emptyTitle="No leads found"
            emptyDescription={hasFilters ? 'Try adjusting your filters.' : 'Create your first lead to get started.'}
            emptyAction={
              !hasFilters ? (
                <Button size="sm" variant="outline" onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create your first lead
                </Button>
              ) : undefined
            }
            mobileCard={(lead) => (
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <button
                    className="font-medium hover:underline"
                    onClick={() => router.push(`/leads/${lead.id}`)}
                  >
                    {lead.fullName}
                  </button>
                  <StatusBadge status={lead.status} />
                </div>
                <p className="text-sm text-muted-foreground">{lead.email || lead.phone || '—'}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <StatusBadge status={lead.priority} kind="priority" />
                  <span>{lead.serviceType || '—'}</span>
                  <span>· {formatDate(lead.createdAt)}</span>
                </div>
              </div>
            )}
          />
          {!loading && leads.length > 0 && (
            <Pagination
              page={meta.page}
              totalPages={meta.totalPages}
              total={meta.total}
              limit={PAGE_SIZE}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      <LeadFormDialog open={formOpen} onOpenChange={setFormOpen} lead={editing} onSaved={load} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete lead?"
        description={`This will remove ${deleting?.fullName}. This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}
