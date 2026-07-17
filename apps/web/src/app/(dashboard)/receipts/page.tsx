'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Plus, Printer } from 'lucide-react';
import Link from 'next/link';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { TableToolbar } from '@/components/ui/table-toolbar';
import { Pagination } from '@/components/ui/pagination';
import { Money } from '@/components/travel/money';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/lib/utils';
import { Receipt, Paginated } from '@/lib/crm';
import { ReceiptFormDialog } from './receipt-form-dialog';

const PAGE_SIZE = 25;

export default function ReceiptsPage() {
  const [items, setItems] = useState<Receipt[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Receipt | null>(null);
  const { activeTenant, activeBranch } = useAuthStore();

  const load = useCallback(() => {
    if (!activeTenant) return;
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));
    api
      .get<Paginated<Receipt>>(`/api/v1/tenant/receipts?${params.toString()}`, {
        tenantId: activeTenant.id,
        branchId: activeBranch?.id,
      })
      .then((res) => {
        setItems(res.data);
        setMeta({ page: res.page, totalPages: res.totalPages, total: res.total });
      })
      .catch((err) => setError(err.message || 'Failed to load receipts'))
      .finally(() => setLoading(false));
  }, [activeTenant, activeBranch, search, page]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    setPage(1);
  }, [search]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (r: Receipt) => {
    setEditing(r);
    setFormOpen(true);
  };

  const columns: DataTableColumn<Receipt>[] = [
    { key: 'number', header: 'Receipt #', cell: (r) => <span className="font-medium">{r.receiptNumber}</span> },
    { key: 'amount', header: 'Amount', align: 'right', cell: (r) => <Money amount={r.amount} currency={r.currencyCode} className="font-medium" /> },
    { key: 'method', header: 'Method', hideOnMobile: true, cell: (r) => <span className="text-muted-foreground">{r.paymentMethod || '—'}</span> },
    { key: 'reference', header: 'Reference', hideOnMobile: true, cell: (r) => <span className="text-muted-foreground">{r.reference || '—'}</span> },
    { key: 'received', header: 'Received', hideOnMobile: true, cell: (r) => <span className="text-muted-foreground">{r.receivedAt ? formatDate(r.receivedAt) : '—'}</span> },
    { key: 'created', header: 'Created', hideOnMobile: true, cell: (r) => <span className="text-muted-foreground">{formatDate(r.createdAt)}</span> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          <Button asChild variant="ghost" size="icon" title="Print">
            <Link href={`/receipts/${r.id}/print`} target="_blank"><Printer className="h-4 w-4" /></Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>
            Edit
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Receipts"
        subtitle="View payment receipts issued to clients"
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New Receipt
          </Button>
        }
      />

      <TableToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search receipt number…"
        hasActiveFilters={search !== ''}
        onReset={() => setSearch('')}
      />

      {error ? (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={items}
            rowKey={(r) => r.id}
            loading={loading}
            emptyTitle="No receipts found"
            emptyDescription={search ? 'Try a different search.' : 'Receipts are generated when payments are received.'}
            mobileCard={(r) => (
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{r.receiptNumber}</span>
                  <Money amount={r.amount} currency={r.currencyCode} className="font-semibold" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {r.paymentMethod || '—'} · {formatDate(r.createdAt)}
                </p>
              </div>
            )}
          />
          {!loading && items.length > 0 && (
            <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} limit={PAGE_SIZE} onPageChange={setPage} />
          )}
        </>
      )}

      <ReceiptFormDialog open={formOpen} onOpenChange={setFormOpen} receipt={editing} onSaved={load} />
    </div>
  );
}
