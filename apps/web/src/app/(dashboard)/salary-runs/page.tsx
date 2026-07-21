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
const STATUSES = ['DRAFT', 'GENERATED', 'APPROVED', 'PAID', 'CANCELLED'];

interface SalaryRunRow {
  id: string;
  salaryRunNumber?: string;
  period?: string;
  totalGross?: number | string;
  totalNet?: number | string;
  currencyCode?: string;
  status: string;
  createdAt: string;
}

export default function SalaryRunsPage() {
  const [items, setItems] = useState<SalaryRunRow[]>([]);
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
      .get<{ data: SalaryRunRow[]; page: number; totalPages: number; total: number }>(
        `/api/v1/tenant/salary-runs?${params.toString()}`,
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

  const columns: DataTableColumn<SalaryRunRow>[] = [
    { key: 'number', header: 'Run #', cell: (s) => <span className="font-medium">{s.salaryRunNumber || s.id}</span> },
    { key: 'period', header: 'Period', cell: (s) => <span className="text-muted-foreground">{s.period || '—'}</span> },
    { key: 'gross', header: 'Gross', align: 'right', hideOnMobile: true, cell: (s) => <Money amount={s.totalGross} currency={s.currencyCode || 'USD'} /> },
    { key: 'net', header: 'Net', align: 'right', cell: (s) => <Money amount={s.totalNet} currency={s.currencyCode || 'USD'} className="font-medium" /> },
    { key: 'status', header: 'Status', cell: (s) => <StatusBadge status={s.status} /> },
    { key: 'created', header: 'Created', hideOnMobile: true, cell: (s) => <span className="text-muted-foreground">{formatDate(s.createdAt)}</span> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Salary Runs" subtitle="Generate and approve monthly salary runs" />

      <TableToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search run # or period…"
        hasActiveFilters={search !== '' || status !== ''}
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
            rowKey={(s) => s.id}
            loading={loading}
            emptyTitle="No salary runs found"
            emptyDescription="Create a salary run to process employee payroll."
            mobileCard={(s) => (
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{s.salaryRunNumber || s.id}</span>
                  <StatusBadge status={s.status} />
                </div>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">{s.period || '—'}</span>
                  <Money amount={s.totalNet} currency={s.currencyCode || 'USD'} className="font-semibold" />
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
