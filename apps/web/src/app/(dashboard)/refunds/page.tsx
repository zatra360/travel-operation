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
const STATUSES = ['REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PROCESSED'];

interface RefundRow {
  id: string;
  refundNumber?: string;
  requestedAmount?: number | string;
  currencyCode?: string;
  reason?: string;
  status: string;
  createdAt: string;
}

export default function RefundsPage() {
  const [items, setItems] = useState<RefundRow[]>([]);
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
      .get<{ data: RefundRow[]; page: number; totalPages: number; total: number }>(
        `/api/v1/tenant/refunds?${params.toString()}`,
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

  const columns: DataTableColumn<RefundRow>[] = [
    { key: 'number', header: 'Refund #', cell: (r) => <span className="font-medium">{r.refundNumber || r.id}</span> },
    { key: 'amount', header: 'Amount', align: 'right', cell: (r) => <Money amount={r.requestedAmount} currency={r.currencyCode || 'USD'} className="font-medium" /> },
    { key: 'reason', header: 'Reason', hideOnMobile: true, cell: (r) => <span className="text-muted-foreground">{r.reason || '—'}</span> },
    { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
    { key: 'created', header: 'Created', hideOnMobile: true, cell: (r) => <span className="text-muted-foreground">{formatDate(r.createdAt)}</span> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Refunds" subtitle="Manage refund requests, approvals and processing" />

      <TableToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search refund # or reason…"
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
            rowKey={(r) => r.id}
            loading={loading}
            emptyTitle="No refunds found"
            emptyDescription="Refund requests appear here when customers or agents submit them."
            mobileCard={(r) => (
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{r.refundNumber || r.id}</span>
                  <StatusBadge status={r.status} />
                </div>
                <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                  <span className="truncate">{r.reason || '—'}</span>
                  <Money amount={r.requestedAmount} currency={r.currencyCode || 'USD'} />
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
