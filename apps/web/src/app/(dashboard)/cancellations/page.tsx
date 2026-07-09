'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDateTime } from '@/lib/utils';

export default function CancellationsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const { activeTenant } = useAuthStore();

  const load = useCallback(() => {
    if (!activeTenant) return;
    setLoading(true); setError('');
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    api.get<any>(`/api/v1/tenant/cancellations?${params.toString()}`, { tenantId: activeTenant.id })
      .then((res) => setItems(res.data || []))
      .catch((err) => setError(err.message || 'Failed'))
      .finally(() => setLoading(false));
  }, [activeTenant, search, status]);

  useEffect(() => { load(); }, [load]);

  const statuses = ['REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PROCESSED'];
  const variant = (s: string) => s === 'APPROVED' ? 'success' : s === 'PROCESSED' ? 'default' : s === 'REJECTED' ? 'destructive' : 'secondary';

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Cancellations</h2>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" /></div>
        {statuses.map((s) => (<Button key={s} variant={status === s ? 'default' : 'outline'} size="sm" onClick={() => setStatus(s)}>{s}</Button>))}
        <Button variant={status === '' ? 'default' : 'outline'} size="sm" onClick={() => setStatus('')}>All</Button>
      </div>
      <Card><CardContent className="pt-6">
        {loading ? <p className="text-muted-foreground">Loading...</p> :
         error ? <p className="text-sm text-destructive">{error}</p> :
         items.length === 0 ? <p className="text-muted-foreground">No cancellations found. Cancellation requests appear here when bookings need to be cancelled.</p> : (
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="pb-3">Cancel #</th><th className="pb-3">Charge</th><th className="pb-3">Refundable</th><th className="pb-3">Reason</th><th className="pb-3">Status</th><th className="pb-3">Created</th></tr></thead><tbody>
            {items.map((c) => (<tr key={c.id} className="border-b last:border-0"><td className="py-3 font-medium">{c.cancellationNumber || c.id}</td><td className="py-3">${Number(c.cancellationCharge || 0).toFixed(2)}</td><td className="py-3">${Number(c.refundableAmount || 0).toFixed(2)}</td><td className="py-3 text-muted-foreground">{c.reason || '--'}</td><td className="py-3"><Badge variant={variant(c.status)}>{c.status}</Badge></td><td className="py-3 text-muted-foreground">{formatDateTime(c.createdAt)}</td></tr>))}
          </tbody></table></div>
        )}
      </CardContent></Card>
    </div>
  );
}
