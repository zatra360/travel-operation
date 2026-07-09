'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/lib/utils';
import { Receipt, Paginated } from '@/lib/crm';
import { ReceiptFormDialog } from './receipt-form-dialog';

export default function ReceiptsPage() {
  const [items, setItems] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Receipt | null>(null);
  const { activeTenant } = useAuthStore();

  const load = useCallback(() => {
    if (!activeTenant) return;
    setLoading(true); setError('');
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    api.get<Paginated<Receipt>>(`/api/v1/tenant/receipts?${params.toString()}`, { tenantId: activeTenant.id })
      .then((res) => setItems(res.data))
      .catch((err) => setError(err.message || 'Failed to load receipts'))
      .finally(() => setLoading(false));
  }, [activeTenant, search]);

  useEffect(() => { load(); }, [load]);
  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (r: Receipt) => { setEditing(r); setFormOpen(true); };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Receipts"
        subtitle="View payment receipts issued to clients"
        actions={<Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-2" />New Receipt</Button>}
      />
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search receipt number..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" /></div>
      </div>
      <Card>
        <CardHeader><CardTitle>All Receipts</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground">Loading receipts...</p>
          : error ? <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          : items.length === 0 ? <div className="py-10 text-center"><p className="text-muted-foreground">No receipts found.</p><Button size="sm" variant="outline" className="mt-3" onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Create your first receipt</Button></div>
          : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="pb-3 font-medium">Receipt #</th><th className="pb-3 font-medium">Amount</th><th className="pb-3 font-medium">Method</th><th className="pb-3 font-medium">Reference</th><th className="pb-3 font-medium">Received</th><th className="pb-3 font-medium">Created</th><th className="pb-3 font-medium text-right">Actions</th></tr></thead>
          <tbody>{items.map((r) => (<tr key={r.id} className="border-b last:border-0"><td className="py-3 font-medium">{r.receiptNumber}</td><td className="py-3 font-medium">{r.currencyCode} {r.amount.toLocaleString()}</td><td className="py-3 text-muted-foreground">{r.paymentMethod || '--'}</td><td className="py-3 text-muted-foreground">{r.reference || '--'}</td><td className="py-3 text-muted-foreground">{r.receivedAt ? formatDate(r.receivedAt) : '--'}</td><td className="py-3 text-muted-foreground">{formatDate(r.createdAt)}</td><td className="py-3"><div className="flex items-center justify-end gap-1"><Button variant="ghost" size="sm" onClick={() => openEdit(r)}>Edit</Button></div></td></tr>))}</tbody></table></div>}
        </CardContent>
      </Card>
      <ReceiptFormDialog open={formOpen} onOpenChange={setFormOpen} receipt={editing} onSaved={load} />
    </div>
  );
}
