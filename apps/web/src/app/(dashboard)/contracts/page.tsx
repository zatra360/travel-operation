'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { TableToolbar } from '@/components/ui/table-toolbar';
import { Pagination } from '@/components/ui/pagination';
import { FileText } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate, formatMoney } from '@/lib/utils';
import { toast } from 'sonner';

const STATUS_V: Record<string, any> = { DRAFT: 'secondary', SENT: 'default', SIGNED: 'info', ACTIVE: 'success', EXPIRED: 'destructive' };
const PAGE_SIZE = 25;

export default function ContractsPage() {
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
    api.get<any>(`/api/v1/tenant/contracts?${p.toString()}`, { tenantId: activeTenant.id })
      .then(r => { setData(r.data || []); setMeta({ page: r.page || 1, totalPages: r.totalPages || 1, total: r.total || 0 }); })
      .catch(() => toast.error('Failed')).finally(() => setLoading(false));
  }, [activeTenant, search, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search]);

  const cols: DataTableColumn<any>[] = [
    { key: 'contractNumber', header: 'Contract #', cell: (c) => <span className="font-mono text-xs font-medium">{c.contractNumber}</span> },
    { key: 'subject', header: 'Subject', cell: (c) => <span className="font-medium text-sm">{c.subject || '—'}</span> },
    { key: 'client', header: 'Client', hideOnMobile: true, cell: (c) => c.client ? <Link href={`/clients/${c.client.id}`} className="text-sm text-primary hover:underline">{c.client.displayName}</Link> : <span className="text-muted-foreground">—</span> },
    { key: 'status', header: 'Status', cell: (c) => <Badge variant={STATUS_V[c.status] || 'secondary'} className="text-[10px]">{c.status}</Badge> },
    { key: 'amount', header: 'Amount', align: 'right', hideOnMobile: true, cell: (c) => <span className="text-sm font-medium">{formatMoney(c.amount, c.currencyCode)}</span> },
    { key: 'created', header: 'Created', hideOnMobile: true, cell: (c) => <span className="text-xs text-muted-foreground">{formatDate(c.createdAt)}</span> },
  ];

  return (<div className="space-y-5">
    <PageHeader title="Contracts" subtitle={`${meta.total} contracts`} />
    <TableToolbar search={search} onSearchChange={v => setSearch(v)} searchPlaceholder="Search..." hasActiveFilters={search !== ''} onReset={() => setSearch('')} />
    <DataTable columns={cols} data={data} rowKey={c => c.id} loading={loading} emptyTitle="No contracts" emptyDescription={search ? 'Try adjusting.' : 'Contracts appear here.'} />
    {!loading && data.length > 0 && <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} limit={PAGE_SIZE} onPageChange={setPage} />}
  </div>);
}
