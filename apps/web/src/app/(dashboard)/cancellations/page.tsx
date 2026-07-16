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

interface CancelRow {
  id: string;
  cancellationNumber?: string;
  cancellationCharge?: number | string;
  refundableAmount?: number | string;
  currencyCode?: string;
  reason?: string;
  status: string;
  createdAt: string;
}

export default function CancellationsPage() {
  const [items, setItems] = useState<CancelRow[]>([]);
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
      .get<{ data: CancelRow[]; page: number; totalPages: number; total: number }>(
        `/api/v1/tenant/cancellations?${params.toString()}`,
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

  const columns: DataTableColumn<CancelRow>[] = [
    { key: 'number', header: 'Cancel #', cell: (c: any) => <span className="font-medium">{c.cancellationNumber || c.id}</span> },
    { key: 'ticket', header: 'Ticket', cell: (c: any) => <span className="text-muted-foreground">{c.ticket?.ticketNumber || '—'}</span> },
    { key: 'booking', header: 'Booking', hideOnMobile: true, cell: (c: any) => <span className="text-muted-foreground">{c.booking?.bookingRef || '—'}</span> },
    { key: 'client', header: 'Client', hideOnMobile: true, cell: (c: any) => <span className="text-muted-foreground">{c.client?.displayName || '—'}</span> },
    { key: 'charge', header: 'Charge', align: 'right', cell: (c) => <Money amount={c.cancellationCharge} currency={c.currencyCode || 'USD'} /> },
    { key: 'status', header: 'Status', cell: (c) => <StatusBadge status={c.status} /> },
    { key: 'created', header: 'Created', hideOnMobile: true, cell: (c) => <span className="text-muted-foreground">{formatDate(c.createdAt)}</span> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Cancellations" subtitle="Process booking and ticket cancellation requests" />

      <TableToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search cancel # or reason…"
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
            rowKey={(c) => c.id}
            loading={loading}
            emptyTitle="No cancellations found"
            emptyDescription="Cancellation requests appear here when bookings need to be cancelled."
            mobileCard={(c) => (
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{c.cancellationNumber || c.id}</span>
                  <StatusBadge status={c.status} />
                </div>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">Charge</span>
                  <Money amount={c.cancellationCharge} currency={c.currencyCode || 'USD'} />
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
