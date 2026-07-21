'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { TableToolbar } from '@/components/ui/table-toolbar';
import { Pagination } from '@/components/ui/pagination';
import { ShoppingCart } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate, formatMoney } from '@/lib/utils';
import { toast } from 'sonner';

const STATUS: Record<string, any> = { PENDING: 'warning', PROCESSING: 'default', COMPLETED: 'success', CANCELLED: 'destructive' };
const PAGE_SIZE = 25;

export default function OrdersPage() {
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
    api.get<any>(`/api/v1/tenant/orders?${p.toString()}`, { tenantId: activeTenant.id })
      .then(r => { setData(r.data); setMeta({ page: r.page, totalPages: r.totalPages, total: r.total }); })
      .catch(() => toast.error('Failed')).finally(() => setLoading(false));
  }, [activeTenant, search, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search]);

  const cols: DataTableColumn<any>[] = [
    { key: 'orderNumber', header: 'Order #', cell: (o) => <span className="font-medium font-mono text-xs">{o.orderNumber}</span> },
    { key: 'client', header: 'Client', hideOnMobile: true, cell: (o) => o.client ? <Link href={`/clients/${o.client.id}`} className="text-sm text-primary hover:underline">{o.client.displayName}</Link> : <span className="text-muted-foreground">—</span> },
    { key: 'status', header: 'Status', cell: (o) => <Badge variant={STATUS[o.status] || 'secondary'} className="text-[10px]">{o.status}</Badge> },
    { key: 'total', header: 'Total', align: 'right', cell: (o) => <span className="font-medium text-sm">{formatMoney(o.grandTotal, o.currencyCode)}</span> },
    { key: 'items', header: 'Items', hideOnMobile: true, cell: (o) => <span className="text-muted-foreground text-xs">{o.items?.length || 0}</span> },
    { key: 'created', header: 'Created', hideOnMobile: true, cell: (o) => <span className="text-muted-foreground text-xs">{formatDate(o.createdAt)}</span> },
  ];

  return (<div className="space-y-5">
    <PageHeader title="Orders" subtitle={`${meta.total} orders`} />
    <TableToolbar search={search} onSearchChange={v => setSearch(v)} searchPlaceholder="Search..." hasActiveFilters={search !== ''} onReset={() => setSearch('')} />
    <DataTable columns={cols} data={data} rowKey={o => o.id} loading={loading} emptyTitle="No orders" emptyDescription={search ? 'Try adjusting.' : 'Orders appear here.'} />
    {!loading && data.length > 0 && <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} limit={PAGE_SIZE} onPageChange={setPage} />}
  </div>);
}
