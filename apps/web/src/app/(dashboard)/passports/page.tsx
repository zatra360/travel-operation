'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { FileCheck, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/lib/utils';

export default function PassportsPage() {
  const { activeTenant } = useAuthStore();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeTenant) return;
    api.get('/api/v1/tenant/clients?limit=100', { tenantId: activeTenant.id }).then(async (res: any) => {
      const all: any[] = [];
      for (const client of res.data) {
        try {
          const passports: any[] = await api.get(`/api/v1/tenant/clients/${client.id}/passports`, { tenantId: activeTenant.id });
          all.push(...passports.map((p: any) => ({ ...p, client })));
        } catch {}
      }
      setClients(all);
      setLoading(false);
    });
  }, [activeTenant]);

  const isExpiringSoon = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const months = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);
    return months < 3;
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Passports" subtitle={`${clients.length} passports across all clients`} />
      <div className="grid gap-2">
        {clients.map((p: any) => (
          <Card key={p.id}>
            <CardContent className="flex items-center justify-between py-3">
              <div className="flex items-center gap-4">
                <FileCheck className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{p.fullName}</p>
                  <p className="text-sm text-muted-foreground">#{p.passportNumber} · {p.client?.displayName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {isExpiringSoon(p.expiryDate) && <AlertTriangle className="h-4 w-4 text-warning" />}
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Expires</p>
                  <p className={`text-sm font-medium ${isExpiringSoon(p.expiryDate) ? 'text-warning' : ''}`}>{formatDate(p.expiryDate)}</p>
                </div>
                <Badge variant={p.isVerified ? 'default' : 'secondary'} className="text-xs">{p.isVerified ? 'Verified' : 'Pending'}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
        {clients.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No passports on file.</p>}
      </div>
    </div>
  );
}
