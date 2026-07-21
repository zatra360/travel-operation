'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { TableToolbar } from '@/components/ui/table-toolbar';
import { Pagination } from '@/components/ui/pagination';
import { Globe, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const VISA_BADGE: Record<string, any> = { PENDING: 'warning', APPROVED: 'success', REJECTED: 'destructive', EXPIRED: 'destructive' };
const PAGE_SIZE = 25;

export default function VisasPage() {
  const { activeTenant } = useAuthStore();
  const [data, setData] = useState<any[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    if (!activeTenant) return; setLoading(true);
    const p = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (search) p.set('search', search);
    api.get<any>(`/api/v1/tenant/visas?${p.toString()}`, { tenantId: activeTenant.id })
      .then(r => { setData(r.data); setMeta({ page: r.page, totalPages: r.totalPages, total: r.total }); })
      .catch(() => toast.error('Failed'))
      .finally(() => setLoading(false));
  }, [activeTenant, search, page]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search]);

  const cols: DataTableColumn<any>[] = [
    { key: 'visaType', header: 'Type', cell: (v) => <span className="font-medium">{v.visaType}</span> },
    { key: 'country', header: 'Country', cell: (v) => <span className="text-muted-foreground text-sm">{v.country?.name || '—'}</span> },
    { key: 'client', header: 'Client', hideOnMobile: true, cell: (v) => v.client ? <Link href={`/clients/${v.client.id}`} className="text-sm text-primary hover:underline">{v.client.displayName}</Link> : <span className="text-muted-foreground">—</span> },
    { key: 'status', header: 'Status', cell: (v) => <Badge variant={VISA_BADGE[v.status] || 'secondary'} className="text-[10px]">{v.status}</Badge> },
    { key: 'expiry', header: 'Expiry', cell: (v) => <span className={cn('text-sm', new Date(v.expiryDate).getTime() < Date.now() ? 'text-destructive font-semibold' : 'text-muted-foreground')}>{v.expiryDate ? formatDate(v.expiryDate) : '—'}</span> },
  ];

  return (<div className="space-y-5">
    <PageHeader title="Visas" subtitle={`${meta.total} visas · Track status and expiry`} />
    <TableToolbar search={search} onSearchChange={v => setSearch(v)} searchPlaceholder="Search..." hasActiveFilters={search !== ''} onReset={() => setSearch('')} />
    <DataTable columns={cols} data={data} rowKey={v => v.id} loading={loading} emptyTitle="No visas" emptyDescription={search ? 'Try adjusting.' : 'Visas from client profiles appear here.'} />
    {!loading && data.length > 0 && <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} limit={PAGE_SIZE} onPageChange={setPage} />}
  </div>);
}
