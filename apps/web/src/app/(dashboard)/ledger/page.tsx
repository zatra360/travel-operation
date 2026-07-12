'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { TableToolbar } from '@/components/ui/table-toolbar';
import { Pagination } from '@/components/ui/pagination';
import { Money } from '@/components/travel/money';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/lib/utils';
import { LedgerEntry, Paginated } from '@/lib/crm';

const PAGE_SIZE = 25;

export default function LedgerPage() {
  const [items, setItems] = useState<LedgerEntry[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
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
      .get<Paginated<LedgerEntry>>(`/api/v1/tenant/ledger?${params.toString()}`, {
        tenantId: activeTenant.id,
        branchId: activeBranch?.id,
      })
      .then((res) => {
        setItems(res.data);
        setMeta({ page: res.page, totalPages: res.totalPages, total: res.total });
      })
      .catch((err) => setError(err.message || 'Failed'))
      .finally(() => setLoading(false));
  }, [activeTenant, activeBranch, search, page]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    setPage(1);
  }, [search]);

  const isCredit = (d?: string) => (d || '').toUpperCase() === 'CREDIT';

  const columns: DataTableColumn<LedgerEntry>[] = [
    { key: 'date', header: 'Date', cell: (e) => <span className="text-muted-foreground">{formatDate(e.entryDate)}</span> },
    {
      key: 'direction',
      header: 'Direction',
      cell: (e) => (
        <Badge variant={isCredit(e.direction) ? 'success' : 'secondary'} className="capitalize">
          {(e.direction || '').toLowerCase()}
        </Badge>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      cell: (e) => (
        <Money
          amount={(isCredit(e.direction) ? 1 : -1) * Number(e.amount)}
          currency={e.currencyCode}
          colorNegative
          className="font-medium"
        />
      ),
    },
    { key: 'refType', header: 'Ref Type', hideOnMobile: true, cell: (e) => <span className="text-muted-foreground">{e.referenceType || '—'}</span> },
    { key: 'description', header: 'Description', hideOnMobile: true, cell: (e) => <span className="text-muted-foreground">{e.description || '—'}</span> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Ledger" subtitle="View all financial ledger entries and transactions" />

      <TableToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search description…"
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
            rowKey={(e) => e.id}
            loading={loading}
            emptyTitle="No ledger entries found"
            emptyDescription="Financial transactions (payments, refunds, cancellations) automatically create ledger entries."
            mobileCard={(e) => (
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={isCredit(e.direction) ? 'success' : 'secondary'} className="capitalize">
                    {(e.direction || '').toLowerCase()}
                  </Badge>
                  <Money amount={(isCredit(e.direction) ? 1 : -1) * Number(e.amount)} currency={e.currencyCode} colorNegative className="font-semibold" />
                </div>
                <p className="text-sm text-muted-foreground">{e.description || e.referenceType || '—'}</p>
                <p className="text-xs text-muted-foreground">{formatDate(e.entryDate)}</p>
              </div>
            )}
          />
          {!loading && items.length > 0 && (
            <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} limit={PAGE_SIZE} onPageChange={setPage} />
          )}
        </>
      )}
    </div>
  );
}
