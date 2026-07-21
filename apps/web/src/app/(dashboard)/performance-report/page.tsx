'use client';
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatMoney } from '@/lib/utils';

type SortKey = 'bookings' | 'leadsWon' | 'quotesAccepted' | 'commissionTotal';

export default function PerformancePage() {
  const { activeTenant } = useAuthStore();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('commissionTotal');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    if (!activeTenant) return;
    api.get<any[]>('/api/v1/tenant/dashboard/performance', { tenantId: activeTenant.id })
      .then((data) => setEmployees(data)).finally(() => setLoading(false));
  }, [activeTenant]);

  const sorted = useMemo(() => {
    return [...employees].sort((a, b) => {
      const diff = (a[sortKey] || 0) - (b[sortKey] || 0);
      return sortAsc ? diff : -diff;
    });
  }, [employees, sortKey, sortAsc]);

  if (loading) return <Skeleton className="h-96" />;
  const totalCommission = employees.reduce((s, e) => s + (e.commissionTotal || 0), 0);
  const totalBookings = employees.reduce((s, e) => s + (e.bookings || 0), 0);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Performance" subtitle={`${employees.length} employees · ${totalBookings} bookings · ${formatMoney(totalCommission, 'USD')} earned`} />
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <span>Sort by:</span>
        {(['bookings', 'leadsWon', 'quotesAccepted', 'commissionTotal'] as SortKey[]).map(k => (
          <Button key={k} variant={sortKey === k ? 'secondary' : 'outline'} size="sm" className="h-7 text-xs" onClick={() => toggleSort(k)}>
            {k === 'bookings' ? 'Bookings' : k === 'leadsWon' ? 'Leads Won' : k === 'quotesAccepted' ? 'Quotes' : 'Commission'}
            {sortKey === k ? (sortAsc ? ' ↑' : ' ↓') : ''}
          </Button>
        ))}
      </div>
      <div className="space-y-3">
        {sorted.map((e: any) => (
          <Card key={e.id}>
            <CardContent className="flex items-center justify-between py-3">
              <div className="flex items-center gap-4 min-w-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm shrink-0">
                  {e.firstName?.charAt(0)}{e.lastName?.charAt(0)}
                </div>
                <div>
                  <p className="font-medium">{e.firstName} {e.lastName}</p>
                  <p className="text-xs text-muted-foreground">{e.employeeCode} · {e.position || 'No position'}{e.department ? ` · ${e.department}` : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="text-center"><p className="text-xs text-muted-foreground">Bookings</p><p className="font-semibold">{e.bookings || 0}</p></div>
                <div className="text-center"><p className="text-xs text-muted-foreground">Leads Won</p><p className="font-semibold">{e.leadsWon || 0}</p></div>
                <div className="text-center"><p className="text-xs text-muted-foreground">Quotes</p><p className="font-semibold">{e.quotesAccepted || 0}</p></div>
                <div className="text-center"><p className="text-xs text-muted-foreground">Leaves</p><p className="font-semibold">{e.leaves || 0}</p></div>
                <div className="text-center min-w-[80px]">
                  <p className="text-xs text-muted-foreground">Commission</p>
                  <p className="font-semibold text-success">{formatMoney(e.commissionTotal || 0, 'USD')}</p>
                  {e.commissionPending > 0 && <Badge variant="warning" className="text-[10px]">{formatMoney(e.commissionPending, 'USD')} pending</Badge>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
