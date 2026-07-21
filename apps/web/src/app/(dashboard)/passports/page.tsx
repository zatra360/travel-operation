'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { TableToolbar } from '@/components/ui/table-toolbar';
import { Pagination } from '@/components/ui/pagination';
import { FileCheck, AlertTriangle, Plus, Pencil, Trash2, User, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const PAGE_SIZE = 25;

export default function PassportsPage() {
  const { activeTenant } = useAuthStore();
  const [data, setData] = useState<any[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    if (!activeTenant) return;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (search) params.set('search', search);
    api.get<any>(`/api/v1/tenant/passports?${params.toString()}`, { tenantId: activeTenant.id })
      .then(res => { setData(res.data); setMeta({ page: res.page, totalPages: res.totalPages, total: res.total }); })
      .catch(() => toast.error('Failed to load passports'))
      .finally(() => setLoading(false));
  }, [activeTenant, search, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search]);

  const isExpiringSoon = (date: string) => new Date(date).getTime() - Date.now() < 90 * 24 * 60 * 60 * 1000;
  const isExpired = (date: string) => new Date(date).getTime() < Date.now();

  const getStatusBadge = (p: any) => {
    if (isExpired(p.expiryDate)) return <Badge variant="destructive" className="text-[10px] flex items-center gap-1"><AlertTriangle className="h-2.5 w-2.5" />Expired</Badge>;
    if (isExpiringSoon(p.expiryDate)) return <Badge variant="warning" className="text-[10px] flex items-center gap-1">Expiring</Badge>;
    return <Badge variant={p.isVerified ? 'success' : 'secondary'} className="text-[10px]">{p.isVerified ? 'Verified' : 'Active'}</Badge>;
  };

  const columns: DataTableColumn<any>[] = [
    {
      key: 'fullName', header: 'Passenger',
      cell: (p) => <div><span className="font-medium">{p.fullName}</span>{p.relation && <span className="ml-1.5 text-[10px] text-muted-foreground bg-muted px-1 py-0.5 rounded">{p.relation}</span>}</div>,
    },
    { key: 'passportNumber', header: 'Passport #', cell: (p) => <span className="font-mono text-xs">{p.passportNumber}</span> },
    {
      key: 'client', header: 'Client', hideOnMobile: true,
      cell: (p) => p.client ? <Link href={`/clients/${p.client.id}`} className="text-sm text-primary hover:underline">{p.client.displayName}</Link> : <span className="text-muted-foreground text-sm">—</span>,
    },
    { key: 'nationality', header: 'Nationality', hideOnMobile: true, cell: (p) => <span className="text-muted-foreground text-xs">{p.nationality || p.countryCode || '—'}</span> },
    { key: 'expiry', header: 'Expiry', cell: (p) => <span className={cn('text-sm', isExpired(p.expiryDate) ? 'text-destructive font-semibold' : isExpiringSoon(p.expiryDate) ? 'text-warning font-medium' : 'text-muted-foreground')}>{formatDate(p.expiryDate)}</span> },
    { key: 'status', header: 'Status', cell: (p) => getStatusBadge(p) },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Passports" subtitle={`${meta.total} passports · Track expiry and verification`} />
      <TableToolbar search={search} onSearchChange={v => setSearch(v)} searchPlaceholder="Search by name or passport number..." hasActiveFilters={search !== ''} onReset={() => setSearch('')} />
      <DataTable columns={columns} data={data} rowKey={p => p.id} loading={loading} emptyTitle="No passports" emptyDescription={search ? 'Try adjusting your search.' : 'Passports from client profiles will appear here.'} mobileCard={(p) => (<div className="space-y-1"><div className="flex items-center justify-between"><span className="font-medium">{p.fullName}</span>{getStatusBadge(p)}</div><p className="text-sm text-muted-foreground">#{p.passportNumber} · {p.client?.displayName}</p><p className="text-xs text-muted-foreground">Expires {formatDate(p.expiryDate)}</p></div>)} />
      {!loading && data.length > 0 && <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} limit={PAGE_SIZE} onPageChange={setPage} />}
    </div>
  );
}
