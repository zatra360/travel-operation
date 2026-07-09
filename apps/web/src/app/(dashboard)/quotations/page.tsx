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
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/lib/utils';
import { Quotation, Paginated, QUOTATION_STATUSES, quotationStatusVariant } from '@/lib/crm';
import { QuotationFormDialog } from './quotation-form-dialog';

export default function QuotationsPage() {
  const [items, setItems] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Quotation | null>(null);
  const [deleting, setDeleting] = useState<Quotation | null>(null);
  const { activeTenant } = useAuthStore();

  const load = useCallback(() => {
    if (!activeTenant) return;
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    api
      .get<Paginated<Quotation>>(`/api/v1/tenant/quotations?${params.toString()}`, {
        tenantId: activeTenant.id,
      })
      .then((res) => setItems(res.data))
      .catch((err) => setError(err.message || 'Failed to load quotations'))
      .finally(() => setLoading(false));
  }, [activeTenant, search, status]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (q: Quotation) => { setEditing(q); setFormOpen(true); };

  const handleDelete = async () => {
    if (!activeTenant || !deleting) return;
    try {
      await api.delete(`/api/v1/tenant/quotations/${deleting.id}`, { tenantId: activeTenant.id });
      toast.success('Quotation deleted');
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete quotation');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Quotations</h2>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />New Quotation
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search quote number or title..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <div className="flex flex-wrap gap-1">
          <Button variant={status === '' ? 'default' : 'outline'} size="sm" onClick={() => setStatus('')}>All</Button>
          {QUOTATION_STATUSES.map((s) => (
            <Button key={s} variant={status === s ? 'default' : 'outline'} size="sm" onClick={() => setStatus(s)}>{s}</Button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>All Quotations</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading quotations...</p>
          ) : error ? (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-muted-foreground">No quotations found.</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />Create your first quotation
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium">Quote #</th>
                    <th className="pb-3 font-medium">Title</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Total</th>
                    <th className="pb-3 font-medium">Valid until</th>
                    <th className="pb-3 font-medium">Created</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((q) => (
                    <tr key={q.id} className="border-b last:border-0">
                      <td className="py-3 font-medium"><Link href={`/quotations/${q.id}`} className="hover:underline text-primary">{q.quoteNumber}</Link></td>
                      <td className="py-3 text-muted-foreground">{q.title || '--'}</td>
                      <td className="py-3">
                        <Badge variant={quotationStatusVariant[q.status] || 'secondary'}>{q.status}</Badge>
                      </td>
                      <td className="py-3 font-medium">{q.currencyCode} {q.grandTotal.toLocaleString()}</td>
                      <td className="py-3 text-muted-foreground">{q.validUntil ? formatDate(q.validUntil) : '--'}</td>
                      <td className="py-3 text-muted-foreground">{formatDate(q.createdAt)}</td>
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(q)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Delete" onClick={() => setDeleting(q)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <QuotationFormDialog open={formOpen} onOpenChange={setFormOpen} quotation={editing} onSaved={load} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete quotation?"
        description={`This will remove ${deleting?.quoteNumber}. This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}
