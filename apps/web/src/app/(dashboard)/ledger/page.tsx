'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/lib/utils';
import { LedgerEntry, Paginated } from '@/lib/crm';

export default function LedgerPage() {
  const [items, setItems] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const { activeTenant } = useAuthStore();

  const load = useCallback(() => {
    if (!activeTenant) return;
    setLoading(true); setError('');
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    api.get<Paginated<LedgerEntry>>(`/api/v1/tenant/ledger?${params.toString()}`, { tenantId: activeTenant.id })
      .then((res) => setItems(res.data))
      .catch((err) => setError(err.message || 'Failed'))
      .finally(() => setLoading(false));
  }, [activeTenant, search]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Ledger</h2>
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search description..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
      </div>
      <Card><CardHeader><CardTitle>General Ledger</CardTitle></CardHeader><CardContent>
        {loading ? <p className="text-muted-foreground">Loading...</p>
        : error ? <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        : items.length === 0 ? <p className="text-muted-foreground">No ledger entries found.</p>
        : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="pb-3 font-medium">Date</th><th className="pb-3 font-medium">Direction</th><th className="pb-3 font-medium">Amount</th><th className="pb-3 font-medium">Ref Type</th><th className="pb-3 font-medium">Description</th></tr></thead>
        <tbody>{items.map((e) => (<tr key={e.id} className="border-b last:border-0"><td className="py-3 text-muted-foreground">{formatDate(e.entryDate)}</td><td className="py-3 font-medium capitalize">{e.direction}</td><td className="py-3 font-medium">{e.currencyCode} {e.amount.toLocaleString()}</td><td className="py-3 text-muted-foreground">{e.referenceType || '--'}</td><td className="py-3 text-muted-foreground">{e.description || '--'}</td></tr>))}</tbody></table></div>}
      </CardContent></Card>
    </div>
  );
}
