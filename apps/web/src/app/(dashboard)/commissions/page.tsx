'use client';

import { useEffect, useState, useCallback } from 'react';
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

const ALL = '__all__';
const PAGE_SIZE = 25;
const STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'PAID'];

interface CommissionRow {
  id: string;
  employeeName?: string;
  sourceType?: string;
  amount?: number | string;
  currencyCode?: string;
  status: string;
  createdAt: string;
}

export default function CommissionsPage() {
  const [items, setItems] = useState<CommissionRow[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
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
      .get<{ data: CommissionRow[]; page: number; totalPages: number; total: number }>(
        `/api/v1/tenant/commissions?${params.toString()}`,
        { tenantId: activeTenant.id, branchId: activeBranch?.id },
      )
      .then((res) => {
        setItems(res.data || []);
        setMeta({ page: res.page ?? 1, totalPages: res.totalPages ?? 1, total: res.total ?? 0 });
      })
      .catch((err) => setError(err.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [activeTenant, activeBranch, search, status, page]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    setPage(1);
  }, [search, status]);

  const columns: DataTableColumn<CommissionRow>[] = [
    { key: 'employee', header: 'Employee', cell: (c) => <span className="font-medium">{c.employeeName || '—'}</span> },
    { key: 'type', header: 'Type', hideOnMobile: true, cell: (c) => <span className="text-muted-foreground">{c.sourceType || '—'}</span> },
    { key: 'amount', header: 'Amount', align: 'right', cell: (c) => <Money amount={c.amount} currency={c.currencyCode || 'USD'} className="font-medium" /> },
    { key: 'status', header: 'Status', cell: (c) => <StatusBadge status={c.status} /> },
    { key: 'created', header: 'Created', hideOnMobile: true, cell: (c) => <span className="text-muted-foreground">{formatDate(c.createdAt)}</span> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Commissions" subtitle="Track employee commissions from bookings and tickets" />

      <TableToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search employee…"
        hasActiveFilters={search !== '' || status !== ''}
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
              {STATUSES.map((s) => (
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
            rowKey={(c) => c.id}
            loading={loading}
            emptyTitle="No commissions found"
            emptyDescription="Commissions are generated from bookings and tickets."
            mobileCard={(c) => (
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{c.employeeName || '—'}</span>
                  <StatusBadge status={c.status} />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{c.sourceType || '—'}</span>
                  <Money amount={c.amount} currency={c.currencyCode || 'USD'} className="font-semibold" />
                </div>
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
