'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/lib/utils';
import { Invoice, Paginated, INVOICE_STATUSES, invoiceStatusVariant } from '@/lib/crm';
import { TableSkeleton } from '@/components/ui/skeleton';
import { InvoiceFormDialog } from './invoice-form-dialog';

export default function InvoicesPage() {
  const [items, setItems] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [deleting, setDeleting] = useState<Invoice | null>(null);
  const { activeTenant } = useAuthStore();

  const load = useCallback(() => {
    if (!activeTenant) return;
    setLoading(true); setError('');
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    api.get<Paginated<Invoice>>(`/api/v1/tenant/invoices?${params.toString()}`, { tenantId: activeTenant.id })
      .then((res) => setItems(res.data))
      .catch((err) => setError(err.message || 'Failed to load invoices'))
      .finally(() => setLoading(false));
  }, [activeTenant, search, status]);

  useEffect(() => { load(); }, [load]);
  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (i: Invoice) => { setEditing(i); setFormOpen(true); };

  const handleDelete = async () => {
    if (!activeTenant || !deleting) return;
    try {
      await api.delete(`/api/v1/tenant/invoices/${deleting.id}`, { tenantId: activeTenant.id });
      toast.success('Invoice deleted'); load();
    } catch (err: any) { toast.error(err.message || 'Failed to delete invoice'); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        subtitle="Track billing, payments, and outstanding amounts"
        actions={
          <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-2" />New Invoice</Button>
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search invoice number..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <div className="flex flex-wrap gap-1">
          <Button variant={status === '' ? 'default' : 'outline'} size="sm" onClick={() => setStatus('')}>All</Button>
          {INVOICE_STATUSES.map((s) => (<Button key={s} variant={status === s ? 'default' : 'outline'} size="sm" onClick={() => setStatus(s)}>{s}</Button>))}
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>All Invoices</CardTitle></CardHeader>
        <CardContent>
          {loading ? <TableSkeleton />
          : error ? <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          : items.length === 0 ? <div className="py-10 text-center"><p className="text-muted-foreground">No invoices found.</p><Button size="sm" variant="outline" className="mt-3" onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Create your first invoice</Button></div>
          : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="pb-3 font-medium">Invoice #</th><th className="pb-3 font-medium">Status</th><th className="pb-3 font-medium">Total</th><th className="pb-3 font-medium">Paid</th><th className="pb-3 font-medium">Due</th><th className="pb-3 font-medium">Due date</th><th className="pb-3 font-medium">Created</th><th className="pb-3 font-medium text-right">Actions</th></tr></thead>
          <tbody>{items.map((i) => (<tr key={i.id} className="border-b last:border-0">
            <td className="py-3 font-medium"><Link href={`/invoices/${i.id}`} className="hover:underline text-primary">{i.invoiceNumber}</Link></td>
            <td className="py-3"><Badge variant={invoiceStatusVariant[i.status] || 'secondary'}>{i.status}</Badge></td>
            <td className="py-3 font-medium">{i.currencyCode} {i.totalAmount.toLocaleString()}</td>
            <td className="py-3">{i.currencyCode} {i.paidAmount.toLocaleString()}</td>
            <td className="py-3">{i.currencyCode} {i.dueAmount.toLocaleString()}</td>
            <td className="py-3 text-muted-foreground">{i.dueAt ? formatDate(i.dueAt) : '--'}</td>
            <td className="py-3 text-muted-foreground">{formatDate(i.createdAt)}</td>
            <td className="py-3"><div className="flex items-center justify-end gap-1"><Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(i)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" title="Delete" onClick={() => setDeleting(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></td>
          </tr>))}</tbody></table></div>}
        </CardContent>
      </Card>
      <InvoiceFormDialog open={formOpen} onOpenChange={setFormOpen} invoice={editing} onSaved={load} />
      <ConfirmDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} title="Delete invoice?" description={`This will remove ${deleting?.invoiceNumber}.`} confirmLabel="Delete" onConfirm={handleDelete} />
    </div>
  );
}
