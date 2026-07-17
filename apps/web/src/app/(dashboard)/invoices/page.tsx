'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Plus, Pencil, Trash2, Printer } from 'lucide-react';
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
import { Invoice, Paginated, INVOICE_STATUSES } from '@/lib/crm';
import { InvoiceFormDialog } from './invoice-form-dialog';

const ALL = '__all__';
const PAGE_SIZE = 25;

export default function InvoicesPage() {
  const [items, setItems] = useState<Invoice[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [deleting, setDeleting] = useState<Invoice | null>(null);
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
      .get<Paginated<Invoice>>(`/api/v1/tenant/invoices?${params.toString()}`, {
        tenantId: activeTenant.id,
        branchId: activeBranch?.id,
      })
      .then((res) => {
        setItems(res.data);
        setMeta({ page: res.page, totalPages: res.totalPages, total: res.total });
      })
      .catch((err) => setError(err.message || 'Failed to load invoices'))
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
  const openEdit = (i: Invoice) => {
    setEditing(i);
    setFormOpen(true);
  };
  const handleDelete = async () => {
    if (!activeTenant || !deleting) return;
    try {
      await api.delete(`/api/v1/tenant/invoices/${deleting.id}`, { tenantId: activeTenant.id });
      toast.success('Invoice deleted');
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete invoice');
    }
  };

  const hasFilters = search !== '' || status !== '';

  const columns: DataTableColumn<Invoice>[] = [
    {
      key: 'number',
      header: 'Invoice #',
      cell: (i) => (
        <Link href={`/invoices/${i.id}`} className="font-medium text-primary hover:underline">
          {i.invoiceNumber}
        </Link>
      ),
    },
    {
      key: 'client', header: 'Client', hideOnMobile: true,
      cell: (i) => i.client ? <Link href={`/clients/${i.clientId}`} className="text-sm text-primary hover:underline">{i.client.displayName}</Link>
        : <span className="text-muted-foreground text-sm">—</span>,
    },
    { key: 'status', header: 'Status', cell: (i) => <StatusBadge status={i.status} /> },
    { key: 'total', header: 'Total', align: 'right', cell: (i) => <Money amount={i.totalAmount} currency={i.currencyCode} className="font-medium" /> },
    { key: 'paid', header: 'Paid', align: 'right', hideOnMobile: true, cell: (i) => <Money amount={i.paidAmount} currency={i.currencyCode} /> },
    { key: 'due', header: 'Due', align: 'right', hideOnMobile: true, cell: (i) => <Money amount={i.dueAmount} currency={i.currencyCode} colorNegative /> },
    { key: 'dueDate', header: 'Due date', hideOnMobile: true, cell: (i) => <span className="text-muted-foreground">{i.dueAt ? formatDate(i.dueAt) : '—'}</span> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (i) => (
        <div className="flex items-center justify-end gap-1">
          <Button asChild variant="ghost" size="icon" title="Print">
            <Link href={`/invoices/${i.id}/print`} target="_blank"><Printer className="h-4 w-4" /></Link>
          </Button>
          <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(i)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Delete" onClick={() => setDeleting(i)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Invoices"
        subtitle="Track billing, payments, and outstanding amounts"
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New Invoice
          </Button>
        }
      />

      <TableToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search invoice number…"
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
              {INVOICE_STATUSES.map((s) => (
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
            rowKey={(i) => i.id}
            loading={loading}
            emptyTitle="No invoices found"
            emptyDescription={hasFilters ? 'Try adjusting your filters.' : 'Create your first invoice to get started.'}
            emptyAction={
              !hasFilters ? (
                <Button size="sm" variant="outline" onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create your first invoice
                </Button>
              ) : undefined
            }
            mobileCard={(i) => (
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/invoices/${i.id}`} className="font-medium text-primary hover:underline">
                    {i.invoiceNumber}
                  </Link>
                  <StatusBadge status={i.status} />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Due</span>
                  <Money amount={i.dueAmount} currency={i.currencyCode} colorNegative />
                </div>
              </div>
            )}
          />
          {!loading && items.length > 0 && (
            <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} limit={PAGE_SIZE} onPageChange={setPage} />
          )}
        </>
      )}

      <InvoiceFormDialog open={formOpen} onOpenChange={setFormOpen} invoice={editing} onSaved={load} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete invoice?"
        description={`This will remove ${deleting?.invoiceNumber}.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}
