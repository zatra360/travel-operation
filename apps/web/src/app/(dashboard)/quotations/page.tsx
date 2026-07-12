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
import { Money } from '@/components/travel/money';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/lib/utils';
import { Quotation, Paginated, QUOTATION_STATUSES } from '@/lib/crm';
import { QuotationFormDialog } from './quotation-form-dialog';

const ALL = '__all__';
const PAGE_SIZE = 25;

export default function QuotationsPage() {
  const [items, setItems] = useState<Quotation[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Quotation | null>(null);
  const [deleting, setDeleting] = useState<Quotation | null>(null);
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
      .get<Paginated<Quotation>>(`/api/v1/tenant/quotations?${params.toString()}`, {
        tenantId: activeTenant.id,
        branchId: activeBranch?.id,
      })
      .then((res) => {
        setItems(res.data);
        setMeta({ page: res.page, totalPages: res.totalPages, total: res.total });
      })
      .catch((err) => setError(err.message || 'Failed to load quotations'))
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
  const openEdit = (q: Quotation) => {
    setEditing(q);
    setFormOpen(true);
  };
  const handleDelete = async () => {
    if (!activeTenant || !deleting) return;
    try {
      await api.delete(`/api/v1/tenant/quotations/${deleting.id}`, { tenantId: activeTenant.id });
      toast.success('Quotation deleted');
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete quotation');
    }
  };

  const hasFilters = search !== '' || status !== '';

  const columns: DataTableColumn<Quotation>[] = [
    {
      key: 'number',
      header: 'Quote #',
      cell: (q) => (
        <Link href={`/quotations/${q.id}`} className="font-medium text-primary hover:underline">
          {q.quoteNumber}
        </Link>
      ),
    },
    { key: 'title', header: 'Title', hideOnMobile: true, cell: (q) => <span className="text-muted-foreground">{q.title || '—'}</span> },
    { key: 'status', header: 'Status', cell: (q) => <StatusBadge status={q.status} /> },
    { key: 'total', header: 'Total', align: 'right', cell: (q) => <Money amount={q.grandTotal} currency={q.currencyCode} className="font-medium" /> },
    { key: 'validUntil', header: 'Valid until', hideOnMobile: true, cell: (q) => <span className="text-muted-foreground">{q.validUntil ? formatDate(q.validUntil) : '—'}</span> },
    { key: 'created', header: 'Created', hideOnMobile: true, cell: (q) => <span className="text-muted-foreground">{formatDate(q.createdAt)}</span> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (q) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(q)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Delete" onClick={() => setDeleting(q)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Quotations"
        subtitle="Prepare, send and track customer quotations"
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New Quotation
          </Button>
        }
      />

      <TableToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search quote number or title…"
        hasActiveFilters={hasFilters}
        onReset={() => {
          setSearch('');
          setStatus('');
        }}
        filters={
          <Select value={status || ALL} onValueChange={(v) => setStatus(v === ALL ? '' : v)}>
            <SelectTrigger className="h-9 w-44" aria-label="Filter by status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {QUOTATION_STATUSES.map((s) => (
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
            rowKey={(q) => q.id}
            loading={loading}
            emptyTitle="No quotations found"
            emptyDescription={hasFilters ? 'Try adjusting your filters.' : 'Create your first quotation to get started.'}
            emptyAction={
              !hasFilters ? (
                <Button size="sm" variant="outline" onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create your first quotation
                </Button>
              ) : undefined
            }
            mobileCard={(q) => (
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/quotations/${q.id}`} className="font-medium text-primary hover:underline">
                    {q.quoteNumber}
                  </Link>
                  <StatusBadge status={q.status} />
                </div>
                <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                  <span className="truncate">{q.title || '—'}</span>
                    <Money amount={q.grandTotal} currency={q.currencyCode} />
                </div>
              </div>
            )}
          />
          {!loading && items.length > 0 && (
            <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} limit={PAGE_SIZE} onPageChange={setPage} />
          )}
        </>
      )}

      <QuotationFormDialog open={formOpen} onOpenChange={setFormOpen} quotation={editing} onSaved={load} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete quotation?"
        description={`This will remove ${deleting?.quoteNumber}. This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}
