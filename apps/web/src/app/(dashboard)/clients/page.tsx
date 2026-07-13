'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Plus, Pencil, Trash2, Eye } from 'lucide-react';
import { ImportExportButtons } from '@/components/import-export-buttons';
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
import { Client, Paginated } from '@/lib/crm';
import { ClientFormDialog } from './client-form-dialog';

const ALL = '__all__';
const PAGE_SIZE = 25;

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState<Client | null>(null);
  const { activeTenant, activeBranch } = useAuthStore();

  const load = useCallback(() => {
    if (!activeTenant) return;
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (type) params.set('type', type);
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));
    api
      .get<Paginated<Client>>(`/api/v1/tenant/clients?${params.toString()}`, {
        tenantId: activeTenant.id,
        branchId: activeBranch?.id,
      })
      .then((res) => {
        setClients(res.data);
        setMeta({ page: res.page, totalPages: res.totalPages, total: res.total });
      })
      .catch((err) => setError(err.message || 'Failed to load clients'))
      .finally(() => setLoading(false));
  }, [activeTenant, activeBranch, search, type, page]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    setPage(1);
  }, [search, type]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (client: Client) => {
    setEditing(client);
    setFormOpen(true);
  };
  const handleDelete = async () => {
    if (!activeTenant || !deleting) return;
    try {
      await api.delete(`/api/v1/tenant/clients/${deleting.id}`, { tenantId: activeTenant.id });
      toast.success('Client deleted');
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete client');
    }
  };

  const hasFilters = search !== '' || type !== '';

  const columns: DataTableColumn<Client>[] = [
    {
      key: 'name',
      header: 'Name',
      cell: (c) => (
        <Link href={`/clients/${c.id}`} className="font-medium hover:underline">
          {c.displayName}
        </Link>
      ),
    },
    { key: 'type', header: 'Type', hideOnMobile: true, cell: (c) => <span className="text-muted-foreground capitalize">{c.type?.toLowerCase()}</span> },
    { key: 'contact', header: 'Contact', hideOnMobile: true, cell: (c) => <span className="text-muted-foreground">{c.email || c.phone || '—'}</span> },
    { key: 'company', header: 'Company', hideOnMobile: true, cell: (c) => <span className="text-muted-foreground">{c.companyName || '—'}</span> },
    { key: 'status', header: 'Status', cell: (c) => <StatusBadge status={c.status} /> },
    { key: 'created', header: 'Created', hideOnMobile: true, cell: (c) => <span className="text-muted-foreground">{formatDate(c.createdAt)}</span> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (c) => (
        <div className="flex items-center justify-end gap-1">
          <Button asChild variant="ghost" size="icon" title="View">
            <Link href={`/clients/${c.id}`}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(c)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Delete" onClick={() => setDeleting(c)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Clients"
        subtitle="Manage customer profiles, bookings, and payment history"
        actions={
          <div className="flex items-center gap-2">
            <ImportExportButtons type="clients" onImported={load} />
            <Button size="sm" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Client</Button>
          </div>
        }
      />

      <TableToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name, email, phone, or company…"
        hasActiveFilters={hasFilters}
        onReset={() => {
          setSearch('');
          setType('');
        }}
        filters={
          <Select value={type || ALL} onValueChange={(v) => setType(v === ALL ? '' : v)}>
            <SelectTrigger className="h-9 w-36" aria-label="Filter by type">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All types</SelectItem>
              <SelectItem value="PERSON">Person</SelectItem>
              <SelectItem value="COMPANY">Company</SelectItem>
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
            data={clients}
            rowKey={(c) => c.id}
            loading={loading}
            emptyTitle="No clients found"
            emptyDescription={hasFilters ? 'Try adjusting your filters.' : 'Create your first client to get started.'}
            emptyAction={
              !hasFilters ? (
                <Button size="sm" variant="outline" onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create your first client
                </Button>
              ) : undefined
            }
            mobileCard={(c) => (
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/clients/${c.id}`} className="font-medium hover:underline">
                    {c.displayName}
                  </Link>
                  <StatusBadge status={c.status} />
                </div>
                <p className="text-sm text-muted-foreground">{c.email || c.phone || c.companyName || '—'}</p>
              </div>
            )}
          />
          {!loading && clients.length > 0 && (
            <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} limit={PAGE_SIZE} onPageChange={setPage} />
          )}
        </>
      )}

      <ClientFormDialog open={formOpen} onOpenChange={setFormOpen} client={editing} onSaved={load} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete client?"
        description={`This will remove ${deleting?.displayName}. This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}
