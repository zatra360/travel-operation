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

interface ReissueRow {
  id: string;
  reissueNumber?: string;
  fareDifference?: number | string;
  serviceCharge?: number | string;
  totalCharge?: number | string;
  currencyCode?: string;
  status: string;
  createdAt: string;
}

export default function ReissuesPage() {
  const [items, setItems] = useState<ReissueRow[]>([]);
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
      .get<{ data: ReissueRow[]; page: number; totalPages: number; total: number }>(
        `/api/v1/tenant/reissues?${params.toString()}`,
        { tenantId: activeTenant.id, branchId: activeBranch?.id },
      )
      .then((res) => {
        setItems(res.data || []);
        setMeta({ page: res.page ?? 1, totalPages: res.totalPages ?? 1, total: res.total ?? 0 });
      })
      .catch((err) => setError(err.message || 'Failed'))
      .finally(() => setLoading(false));
  }, [activeTenant, activeBranch, search, status, page]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    setPage(1);
  }, [search, status]);

  const columns: DataTableColumn<ReissueRow>[] = [
    { key: 'number', header: 'Reissue #', cell: (r) => <span className="font-medium">{r.reissueNumber || r.id}</span> },
    { key: 'fareDiff', header: 'Fare Diff', align: 'right', cell: (r) => <Money amount={r.fareDifference} currency={r.currencyCode || 'USD'} /> },
    { key: 'serviceCharge', header: 'Service', align: 'right', hideOnMobile: true, cell: (r) => <Money amount={r.serviceCharge} currency={r.currencyCode || 'USD'} /> },
    { key: 'total', header: 'Total', align: 'right', cell: (r) => <Money amount={r.totalCharge} currency={r.currencyCode || 'USD'} className="font-medium" /> },
    { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
    { key: 'created', header: 'Created', hideOnMobile: true, cell: (r) => <span className="text-muted-foreground">{formatDate(r.createdAt)}</span> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Reissues" subtitle="Handle ticket reissue requests with fare differences" />

      <TableToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search reissue #…"
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
            emptyTitle="No reissues found"
            emptyDescription="Reissue requests appear here when ticket changes are needed."
            mobileCard={(r) => (
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{r.reissueNumber || r.id}</span>
                  <StatusBadge status={r.status} />
                </div>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <Money amount={r.totalCharge} currency={r.currencyCode || 'USD'} className="font-semibold" />
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
