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
import { Money } from '@/components/travel/money';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/lib/utils';
import { Payment, Paginated, PAYMENT_STATUSES } from '@/lib/crm';
import { PaymentFormDialog } from './payment-form-dialog';

const ALL = '__all__';
const PAGE_SIZE = 25;

export default function PaymentsPage() {
  const [items, setItems] = useState<Payment[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [deleting, setDeleting] = useState<Payment | null>(null);
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
      .get<Paginated<Payment>>(`/api/v1/tenant/payments?${params.toString()}`, {
        tenantId: activeTenant.id,
        branchId: activeBranch?.id,
      })
      .then((res) => {
        setItems(res.data);
        setMeta({ page: res.page, totalPages: res.totalPages, total: res.total });
      })
      .catch((err) => setError(err.message || 'Failed to load payments'))
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
  const openEdit = (p: Payment) => {
    setEditing(p);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!activeTenant || !deleting) return;
    try {
      await api.delete(`/api/v1/tenant/payments/${deleting.id}`, { tenantId: activeTenant.id });
      toast.success('Payment deleted');
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed');
    }
  };

  const hasFilters = search !== '' || status !== '';

  const columns: DataTableColumn<Payment>[] = [
    {
      key: 'method',
      header: 'Method',
      cell: (p) => <span>{p.paymentMethod || '—'}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      cell: (p) => <Money amount={p.amount as unknown as number} currency={p.currencyCode} className="font-medium" />,
    },
    { key: 'status', header: 'Status', cell: (p) => <StatusBadge status={p.status} /> },
    {
      key: 'reference',
      header: 'Reference',
      hideOnMobile: true,
      cell: (p) => <span className="text-muted-foreground">{p.reference || '—'}</span>,
    },
    {
      key: 'received',
      header: 'Received',
      hideOnMobile: true,
      cell: (p) => <span className="text-muted-foreground">{p.receivedAt ? formatDate(p.receivedAt) : '—'}</span>,
    },
    {
      key: 'created',
      header: 'Created',
      hideOnMobile: true,
      cell: (p) => <span className="text-muted-foreground">{formatDate(p.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (p) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(p)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Delete" onClick={() => setDeleting(p)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Payments"
        subtitle="Track received payments against invoices and bookings"
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New Payment
          </Button>
        }
      />

      <TableToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search reference…"
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
              {PAYMENT_STATUSES.map((s) => (
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
            rowKey={(p) => p.id}
            loading={loading}
            emptyTitle="No payments found"
            emptyDescription={hasFilters ? 'Try adjusting your filters.' : 'Record a payment to get started.'}
            emptyAction={
              !hasFilters ? (
                <Button size="sm" variant="outline" onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Record a payment
                </Button>
              ) : undefined
            }
            mobileCard={(p) => (
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <Money amount={p.amount as unknown as number} currency={p.currencyCode} className="font-semibold" />
                  <StatusBadge status={p.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {p.paymentMethod || '—'} · {p.reference || 'No reference'}
                </p>
                <p className="text-xs text-muted-foreground">{formatDate(p.createdAt)}</p>
              </div>
            )}
          />
          {!loading && items.length > 0 && (
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

      <PaymentFormDialog open={formOpen} onOpenChange={setFormOpen} payment={editing} onSaved={load} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete payment?"
        description={`Delete payment of ${deleting?.currencyCode} ${deleting?.amount}?`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}
