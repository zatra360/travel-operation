'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingCart } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate, formatMoney } from '@/lib/utils';

const STATUS_COLORS: Record<string, any> = {
  PENDING: 'warning', CONFIRMED: 'default', PROCESSING: 'default', COMPLETED: 'success', CANCELLED: 'destructive',
};

export default function OrdersPage() {
  const { activeTenant } = useAuthStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeTenant) return;
    api.get('/api/v1/tenant/clients?limit=100', { tenantId: activeTenant.id }).then(async (res: any) => {
      const all: any[] = [];
      for (const client of res.data) {
        try {
          const o: any[] = await api.get(`/api/v1/tenant/clients/${client.id}/orders`, { tenantId: activeTenant.id });
          all.push(...o.map((order: any) => ({ ...order, client })));
        } catch {}
      }
      setOrders(all.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setLoading(false);
    });
  }, [activeTenant]);

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Orders" subtitle={`${orders.length} orders`} />
      <div className="grid gap-2">
        {orders.map((o: any) => (
          <Card key={o.id}>
            <CardContent className="flex items-center justify-between py-3">
              <div className="flex items-center gap-4 min-w-0">
                <ShoppingCart className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="font-medium">{o.orderNumber}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {o.client?.displayName} · {o.items?.length || 0} items
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium tabular-nums">{formatMoney(o.grandTotal, o.currencyCode)}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(o.createdAt)}</p>
                </div>
                <Badge variant={STATUS_COLORS[o.status] || 'secondary'} className="text-xs">{o.status}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
        {orders.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No orders yet.</p>}
      </div>
    </div>
  );
}
