'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, PenTool } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate, formatMoney } from '@/lib/utils';

const STATUS_COLORS: Record<string, any> = {
  DRAFT: 'secondary', SENT: 'default', SIGNED: 'success', ACTIVE: 'success', EXPIRED: 'warning', TERMINATED: 'destructive',
};

export default function ContractsPage() {
  const { activeTenant } = useAuthStore();
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeTenant) return;
    api.get('/api/v1/tenant/clients?limit=100', { tenantId: activeTenant.id }).then(async (res: any) => {
      const all: any[] = [];
      for (const client of res.data) {
        try {
          const c: any[] = await api.get(`/api/v1/tenant/clients/${client.id}/contracts`, { tenantId: activeTenant.id });
          all.push(...c.map((contract: any) => ({ ...contract, client })));
        } catch {}
      }
      setContracts(all.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setLoading(false);
    });
  }, [activeTenant]);

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Contracts" subtitle={`${contracts.length} contracts`} />
      <div className="grid gap-2">
        {contracts.map((c: any) => (
          <Card key={c.id}>
            <CardContent className="flex items-center justify-between py-3">
              <div className="flex items-center gap-4 min-w-0">
                <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="font-medium truncate">{c.subject}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {c.contractNumber} · {c.client?.displayName}
                    {c.quotation && ` · ${c.quotation.quoteNumber}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium tabular-nums">{formatMoney(c.amount, c.currencyCode)}</p>
                  <p className="text-xs text-muted-foreground">{c.contractType?.replace(/_/g, ' ')}</p>
                </div>
                {c.signedAt && <PenTool className="h-4 w-4 text-success" />}
                {c.endDate && <span className="text-xs text-muted-foreground">{formatDate(c.endDate)}</span>}
                <Badge variant={STATUS_COLORS[c.status] || 'secondary'} className="text-xs">{c.status}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
        {contracts.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No contracts yet.</p>}
      </div>
    </div>
  );
}
