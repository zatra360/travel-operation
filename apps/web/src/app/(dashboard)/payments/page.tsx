'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/lib/utils';
import { Skeleton, TableSkeleton } from '@/components/ui/skeleton';
import { Payment, Paginated, PAYMENT_STATUSES, paymentStatusVariant } from '@/lib/crm';
import { PaymentFormDialog } from './payment-form-dialog';

export default function PaymentsPage() {
  const [items, setItems] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [deleting, setDeleting] = useState<Payment | null>(null);
  const { activeTenant } = useAuthStore();

  const load = useCallback(() => {
    if (!activeTenant) return;
    setLoading(true); setError('');
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    api.get<Paginated<Payment>>(`/api/v1/tenant/payments?${params.toString()}`, { tenantId: activeTenant.id })
      .then((res) => setItems(res.data))
      .catch((err) => setError(err.message || 'Failed to load payments'))
      .finally(() => setLoading(false));
  }, [activeTenant, search, status]);

  useEffect(() => { load(); }, [load]);
  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (p: Payment) => { setEditing(p); setFormOpen(true); };

  const handleDelete = async () => {
    if (!activeTenant || !deleting) return;
    try { await api.delete(`/api/v1/tenant/payments/${deleting.id}`, { tenantId: activeTenant.id }); toast.success('Payment deleted'); load(); }
    catch (err: any) { toast.error(err.message || 'Failed'); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        subtitle="Track received payments against invoices and bookings"
        actions={<Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-2" />New Payment</Button>}
      />
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search reference..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" /></div>
        <div className="flex flex-wrap gap-1">
          <Button variant={status === '' ? 'default' : 'outline'} size="sm" onClick={() => setStatus('')}>All</Button>
          {PAYMENT_STATUSES.map((s) => (<Button key={s} variant={status === s ? 'default' : 'outline'} size="sm" onClick={() => setStatus(s)}>{s}</Button>))}
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>All Payments</CardTitle></CardHeader>
        <CardContent>
          {loading ? <TableSkeleton />
          : error ? <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          : items.length === 0 ? <div className="py-10 text-center"><p className="text-muted-foreground">No payments found.</p><Button size="sm" variant="outline" className="mt-3" onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Record a payment</Button></div>
          : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="pb-3 font-medium">Method</th><th className="pb-3 font-medium">Amount</th><th className="pb-3 font-medium">Status</th><th className="pb-3 font-medium">Reference</th><th className="pb-3 font-medium">Received</th><th className="pb-3 font-medium">Created</th><th className="pb-3 font-medium text-right">Actions</th></tr></thead>
          <tbody>{items.map((p) => (<tr key={p.id} className="border-b last:border-0"><td className="py-3 text-muted-foreground">{p.paymentMethod || '--'}</td><td className="py-3 font-medium">{p.currencyCode} {p.amount.toLocaleString()}</td><td className="py-3"><Badge variant={paymentStatusVariant[p.status] || 'secondary'}>{p.status}</Badge></td><td className="py-3 text-muted-foreground">{p.reference || '--'}</td><td className="py-3 text-muted-foreground">{p.receivedAt ? formatDate(p.receivedAt) : '--'}</td><td className="py-3 text-muted-foreground">{formatDate(p.createdAt)}</td><td className="py-3"><div className="flex items-center justify-end gap-1"><Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => setDeleting(p)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></td></tr>))}</tbody></table></div>}
        </CardContent>
      </Card>
      <PaymentFormDialog open={formOpen} onOpenChange={setFormOpen} payment={editing} onSaved={load} />
      <ConfirmDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} title="Delete payment?" description={`Delete payment of ${deleting?.currencyCode} ${deleting?.amount}?`} confirmLabel="Delete" onConfirm={handleDelete} />
    </div>
  );
}
