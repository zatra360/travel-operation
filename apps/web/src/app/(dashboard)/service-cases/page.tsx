'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus, Eye } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { TableToolbar } from '@/components/ui/table-toolbar';
import { Pagination } from '@/components/ui/pagination';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { humanizeStatus } from '@/lib/status';
import { Paginated } from '@/lib/crm';
import { ServiceCase, CASE_STATUSES, caseStatusVariant, serviceIcon } from '@/lib/service-ops';

const ALL = '__all__';
const PAGE_SIZE = 25;

export default function ServiceCasesPage() {
  const [cases, setCases] = useState<ServiceCase[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [scope, setScope] = useState<'all' | 'mine'>('all');
  const [page, setPage] = useState(1);
  const { activeTenant, activeBranch, user } = useAuthStore();
  const userId = user?.id;

  const load = useCallback(() => {
    if (!activeTenant) return;
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (scope === 'mine' && userId) params.set('assignedToId', userId);
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));
    api
      .get<Paginated<ServiceCase>>(`/api/v1/tenant/service-cases?${params.toString()}`, {
        tenantId: activeTenant.id,
        branchId: activeBranch?.id,
      })
      .then((res) => {
        setCases(res.data);
        setMeta({ page: res.page, totalPages: res.totalPages, total: res.total });
      })
      .catch((err) => setError(err.message || 'Failed to load service cases'))
      .finally(() => setLoading(false));
  }, [activeTenant, activeBranch, search, status, scope, page, userId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, status, scope]);

  const hasFilters = search !== '' || status !== '';

  const columns: DataTableColumn<ServiceCase>[] = [
    {
      key: 'case',
      header: 'Case',
      cell: (c) => (
        <div>
          <Link href={`/service-cases/${c.id}`} className="font-medium hover:underline">{c.caseNumber}</Link>
          <p className="max-w-[260px] truncate text-xs text-muted-foreground">{c.title}</p>
        </div>
      ),
    },
    {
      key: 'services',
      header: 'Services',
      cell: (c) => (
        <div className="flex flex-wrap items-center gap-1">
          {c.items.map((i) => {
            const Icon = serviceIcon(i.serviceType.icon);
            return (
              <Badge key={i.id} variant="outline" className="gap-1 text-[10px]" title={`${i.referenceNumber} · ${humanizeStatus(i.currentStageCode ?? i.status)}`}>
                <Icon className="h-3 w-3" />
                {i.serviceType.displayName}
              </Badge>
            );
          })}
        </div>
      ),
    },
    {
      key: 'sla',
      header: 'SLA',
      hideOnMobile: true,
      cell: (c) => {
        const overdue = c.items.filter((i) => i.status === 'ACTIVE' && i.slaDueAt && new Date(i.slaDueAt) < new Date());
        if (overdue.length > 0) return <Badge variant="destructive" className="text-[10px]">{overdue.length} overdue</Badge>;
        const next = c.items
          .filter((i) => i.status === 'ACTIVE' && i.slaDueAt)
          .sort((a, b) => new Date(a.slaDueAt!).getTime() - new Date(b.slaDueAt!).getTime())[0];
        return next ? <span className="text-xs text-muted-foreground">{formatDate(next.slaDueAt!)}</span> : <span className="text-xs text-muted-foreground">—</span>;
      },
    },
    { key: 'priority', header: 'Priority', hideOnMobile: true, cell: (c) => <span className={cn('text-xs', c.priority === 'HIGH' || c.priority === 'URGENT' ? 'font-semibold text-destructive' : 'text-muted-foreground')}>{c.priority}</span> },
    { key: 'status', header: 'Status', cell: (c) => <Badge variant={(caseStatusVariant[c.status] as any) || 'secondary'}>{humanizeStatus(c.status)}</Badge> },
    { key: 'revenue', header: 'Revenue', hideOnMobile: true, align: 'right', cell: (c) => <span className="tabular-nums text-sm">{Number(c.expectedRevenue).toFixed(2)} {c.currencyCode}</span> },
    { key: 'opened', header: 'Opened', hideOnMobile: true, cell: (c) => <span className="text-xs text-muted-foreground">{formatDate(c.openedAt)}</span> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (c) => (
        <Button asChild variant="ghost" size="icon" title="Open">
          <Link href={`/service-cases/${c.id}`}><Eye className="h-4 w-4" /></Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Service Cases"
        subtitle="Operational cases across all travel services with per-item workflows"
        actions={
          <Button size="sm" asChild>
            <Link href="/service-cases/new"><Plus className="mr-2 h-4 w-4" />New Case</Link>
          </Button>
        }
      />

      <div className="flex gap-1 rounded-lg border p-1 w-fit">
        {(['all', 'mine'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setScope(s)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              scope === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent',
            )}
          >
            {s === 'all' ? 'All cases' : 'My cases'}
          </button>
        ))}
      </div>

      <TableToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search case number or title…"
        hasActiveFilters={hasFilters}
        onReset={() => { setSearch(''); setStatus(''); }}
        filters={
          <Select value={status || ALL} onValueChange={(v) => setStatus(v === ALL ? '' : v)}>
            <SelectTrigger className="h-9 w-40" aria-label="Filter by status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {CASE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{humanizeStatus(s)}</SelectItem>
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
            data={cases}
            rowKey={(c) => c.id}
            loading={loading}
            emptyTitle="No service cases found"
            emptyDescription={hasFilters ? 'Try adjusting your filters.' : 'Create your first operational case to get started.'}
            emptyAction={
              !hasFilters ? (
                <Button size="sm" variant="outline" asChild>
                  <Link href="/service-cases/new"><Plus className="mr-2 h-4 w-4" />Create your first case</Link>
                </Button>
              ) : undefined
            }
            mobileCard={(c) => (
              <Link href={`/service-cases/${c.id}`} className="block space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{c.caseNumber}</span>
                  <Badge variant={(caseStatusVariant[c.status] as any) || 'secondary'}>{humanizeStatus(c.status)}</Badge>
                </div>
                <p className="truncate text-sm text-muted-foreground">{c.title}</p>
                <div className="flex flex-wrap gap-1">
                  {c.items.map((i) => (
                    <Badge key={i.id} variant="outline" className="text-[10px]">{i.serviceType.displayName}</Badge>
                  ))}
                </div>
              </Link>
            )}
          />
          {!loading && cases.length > 0 && (
            <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} limit={PAGE_SIZE} onPageChange={setPage} />
          )}
        </>
      )}
    </div>
  );
}
