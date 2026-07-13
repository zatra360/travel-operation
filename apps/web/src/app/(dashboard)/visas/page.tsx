'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Globe, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/lib/utils';

const VISA_STATUS_COLORS: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  PENDING: 'warning', APPLIED: 'default', UNDER_REVIEW: 'default', APPROVED: 'success', REJECTED: 'destructive', EXPIRED: 'destructive',
} as any;

export default function VisasPage() {
  const { activeTenant } = useAuthStore();
  const [visas, setVisas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeTenant) return;
    api.get('/api/v1/tenant/clients?limit=100', { tenantId: activeTenant.id }).then(async (res: any) => {
      const all: any[] = [];
      for (const client of res.data) {
        try {
          const v: any[] = await api.get(`/api/v1/tenant/clients/${client.id}/visas`, { tenantId: activeTenant.id });
          all.push(...v.map((visa: any) => ({ ...visa, client })));
        } catch {}
      }
      setVisas(all);
      setLoading(false);
    });
  }, [activeTenant]);

  const isExpiringSoon = (date?: string) => {
    if (!date) return false;
    const months = (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30);
    return months < 3;
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Visas" subtitle={`${visas.length} visa records`} />
      <div className="grid gap-2">
        {visas.map((v: any) => (
          <Card key={v.id}>
            <CardContent className="flex items-center justify-between py-3">
              <div className="flex items-center gap-4">
                <Globe className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{v.visaType || 'Visa'} {v.country ? `- ${v.country.name}` : ''}</p>
                  <p className="text-sm text-muted-foreground">
                    {v.visaNumber ? `#${v.visaNumber} · ` : ''}{v.client?.displayName}
                    {v.passport && ` · Passport: ${v.passport.passportNumber}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {isExpiringSoon(v.expiryDate) && <AlertTriangle className="h-4 w-4 text-warning" />}
                {v.expiryDate && <div className="text-right">
                  <p className="text-xs text-muted-foreground">Expires</p>
                  <p className="text-sm font-medium">{formatDate(v.expiryDate)}</p>
                </div>}
                <Badge variant={VISA_STATUS_COLORS[v.status] || 'secondary'} className="text-xs">{v.status}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
        {visas.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No visas on file.</p>}
      </div>
    </div>
  );
}
