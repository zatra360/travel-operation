'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { StatusBadge } from '@/components/ui/status-badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Send, CheckCircle, XCircle, Plane, CreditCard, Clock, History, Plus, Pencil, Trash2 } from 'lucide-react';
import { Breadcrumb, PageHeader } from '@/components/ui/page-header';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDateTime, formatMoney } from '@/lib/utils';
import { humanizeStatus } from '@/lib/status';
import {
  type QuotationDetail,
  type QuotationLineItem,
  type TimelineEvent,
  SERVICE_TYPES,
} from '@/lib/crm';

export default function QuotationDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { activeTenant } = useAuthStore();
  const [q, setQ] = useState<QuotationDetail | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const load = useCallback(() => {
    if (!activeTenant) return;
    setLoading(true); setError('');
    Promise.all([
      api.get<QuotationDetail>(`/api/v1/tenant/quotations/${id}`, { tenantId: activeTenant.id }),
      api.get<TimelineEvent[]>(`/api/v1/tenant/quotations/${id}/timeline`, { tenantId: activeTenant.id }).catch(() => []),
    ])
      .then(([qRes, tl]) => { setQ(qRes); setTimeline(tl); })
      .catch((err) => setError(err.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [activeTenant, id]);

  useEffect(() => { load(); }, [load]);

  const action = async (endpoint: string) => {
    try {
      setActionLoading(endpoint);
      await api.post(`/api/v1/tenant/quotations/${id}/${endpoint}`, {}, { tenantId: activeTenant!.id });
      toast.success(`${endpoint.replace(/-/g, ' ')} successful`);
      load();
    } catch (err: any) {
      toast.error(err.message || `Failed to ${endpoint}`);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-64" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-48" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }
  if (error) return <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>;
  if (!q) return <p className="text-muted-foreground">Not found.</p>;

  const currency = (q as any).currencyCode || 'USD';
  const isEditable = q.status === 'DRAFT' || q.status === 'SENT';

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Quotations', href: '/quotations' },
        { label: q.quoteNumber },
      ]} />
      <PageHeader
        title={q.quoteNumber}
        subtitle={`${q.title || 'No title'} · ${humanizeStatus(q.status)}`}
        actions={
          <div className="flex flex-wrap gap-2">
            {q.status === 'DRAFT' && (
              <Button size="sm" onClick={() => action('send')} disabled={actionLoading === 'send'}>
                <Send className="h-4 w-4 mr-2" />Send
              </Button>
            )}
            {q.status === 'SENT' && (
              <>
                <Button size="sm" variant="outline" onClick={() => action('accept')} disabled={actionLoading === 'accept'}>
                  <CheckCircle className="h-4 w-4 mr-2" />Accept
                </Button>
                <Button size="sm" variant="outline" onClick={() => action('reject')} disabled={actionLoading === 'reject'}>
                  <XCircle className="h-4 w-4 mr-2" />Reject
                </Button>
              </>
            )}
            {q.status === 'ACCEPTED' && (
              <>
                <Button size="sm" variant="outline" onClick={() => action('convert-to-booking')} disabled={actionLoading === 'convert-to-booking'}>
                  <Plane className="h-4 w-4 mr-2" />Convert to Booking
                </Button>
                <Button size="sm" variant="outline" onClick={() => action('convert-to-invoice')} disabled={actionLoading === 'convert-to-invoice'}>
                  <CreditCard className="h-4 w-4 mr-2" />Create Invoice
                </Button>
              </>
            )}
            {q.status === 'REJECTED' && (
              <Button size="sm" variant="outline" onClick={() => action('reopen')} disabled={actionLoading === 'reopen'}>
                <XCircle className="h-4 w-4 mr-2" />Reopen as Draft
              </Button>
            )}
            {q.status === 'EXPIRED' && (
              <Button size="sm" variant="outline" onClick={() => action('reopen')} disabled={actionLoading === 'reopen'}>
                <XCircle className="h-4 w-4 mr-2" />Reopen as Draft
              </Button>
            )}
            {(q.status === 'DRAFT' || q.status === 'SENT') && (
              <Button size="sm" variant="outline" onClick={() => setCancelDialogOpen(true)} disabled={actionLoading === 'cancel'}>
                <XCircle className="h-4 w-4 mr-2" />Cancel
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Line Items</CardTitle>
            {isEditable && <AddLineItemButton quotationId={id} tenantId={activeTenant!.id} onAdded={load} />}
          </CardHeader>
          <CardContent>
            {(!q.lineItems || q.lineItems.length === 0) ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {isEditable ? 'Add line items to build this quotation.' : 'No line items.'}
              </p>
            ) : (
              <>
                <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium">Service</th>
                      <th className="pb-2 font-medium hidden sm:table-cell">Description</th>
                      <th className="pb-2 font-medium text-right">Qty</th>
                      <th className="pb-2 font-medium text-right hidden sm:table-cell">Price</th>
                      <th className="pb-2 font-medium text-right">Total</th>
                      {isEditable && <th className="pb-2 font-medium text-right w-16"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {q.lineItems.map((li) => (
                      <tr key={li.id} className="border-b last:border-0">
                        <td className="py-2">
                          <span className="font-medium">{li.title || '—'}</span>
                          {li.serviceType && <span className="text-xs text-muted-foreground block">{humanizeStatus(li.serviceType)}</span>}
                        </td>
                        <td className="py-2 text-muted-foreground hidden sm:table-cell max-w-[200px] truncate">{li.description || '—'}</td>
                        <td className="py-2 text-right tabular-nums">{li.quantity}</td>
                        <td className="py-2 text-right tabular-nums hidden sm:table-cell">{formatMoney(li.unitPrice, currency)}</td>
                        <td className="py-2 text-right font-medium tabular-nums">{formatMoney(li.lineTotal, currency)}</td>
                        {isEditable && <td className="py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <EditLineItemButton item={li} quotationId={id} tenantId={activeTenant!.id} onSaved={load} />
                            <DeleteLineItemButton item={li} quotationId={id} tenantId={activeTenant!.id} onDeleted={load} />
                          </div>
                        </td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="sm:hidden space-y-2 mt-2">
                {q.lineItems.map((li) => (
                  <div key={li.id} className="border rounded-md p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{li.title || '—'}</span>
                      <span className="font-bold tabular-nums">{formatMoney(li.lineTotal, currency)}</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground text-xs mt-1">
                      <span>{li.serviceType ? humanizeStatus(li.serviceType) : '—'} · Qty: {li.quantity}</span>
                      <span>{formatMoney(li.unitPrice, currency)}/ea</span>
                    </div>
                    {isEditable && (
                      <div className="flex justify-end gap-1 mt-2">
                        <EditLineItemButton item={li} quotationId={id} tenantId={activeTenant!.id} onSaved={load} />
                        <DeleteLineItemButton item={li} quotationId={id} tenantId={activeTenant!.id} onDeleted={load} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              </>
            )}
            <Separator className="my-4" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-right text-sm">
              <div><p className="text-xs text-muted-foreground">Subtotal</p><p className="font-medium tabular-nums">{formatMoney(q.subtotal, currency)}</p></div>
              <div><p className="text-xs text-muted-foreground">Tax</p><p className="font-medium tabular-nums">{formatMoney(q.taxTotal, currency)}</p></div>
              <div><p className="text-xs text-muted-foreground">Discount</p><p className="font-medium tabular-nums">{formatMoney(q.discountTotal, currency)}</p></div>
              <div><p className="text-xs text-muted-foreground">Grand Total</p><p className="font-bold text-lg tabular-nums">{formatMoney(q.grandTotal, currency)}</p></div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Info</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><span className="text-muted-foreground">Client: </span>
                <span className="font-medium">{q.client?.displayName || q.clientId || '—'}</span>
              </div>
              <div><span className="text-muted-foreground">Lead: </span>
                <span className="font-medium">{q.lead?.fullName || q.leadId || '—'}</span>
              </div>
              {q.assignedTo && (
                <div><span className="text-muted-foreground">Assigned: </span>
                  <span className="font-medium">{q.assignedTo.firstName} {q.assignedTo.lastName}</span>
                </div>
              )}
              {q.branch && (
                <div><span className="text-muted-foreground">Branch: </span>
                  <span className="font-medium">{q.branch.name}</span>
                </div>
              )}
              <div><span className="text-muted-foreground">Valid until: </span>{q.validUntil ? formatDateTime(q.validUntil) : '—'}</div>
              <div><span className="text-muted-foreground">Revision: </span>{q.currentRevision || 1}</div>
              <div><span className="text-muted-foreground">Created: </span>{formatDateTime(q.createdAt)}</div>
            </CardContent>
          </Card>

          {(q.statusLogs && q.statusLogs.length > 0) && (
            <Card>
              <CardHeader className="flex flex-row items-center gap-2"><History className="h-4 w-4" /><CardTitle>Status History</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {q.statusLogs.slice(0, 10).map((log) => (
                    <li key={log.id} className="flex gap-2 border-b pb-2 last:border-0 text-sm">
                      <div className="mt-0.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                      <div>
                        <p className="flex items-center gap-1.5">
                          {log.fromStatus && <StatusBadge status={log.fromStatus} className="text-xs" />}
                          {log.fromStatus && <span>→</span>}
                          <StatusBadge status={log.toStatus} className="text-xs" />
                        </p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {q.notes && (
        <Card>
          <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
          <CardContent><p className="text-sm">{q.notes}</p></CardContent>
        </Card>
      )}
      {q.terms && (
        <Card>
          <CardHeader><CardTitle>Terms</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{q.terms}</p></CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4" />Timeline</CardTitle></CardHeader>
        <CardContent>
          {timeline.length === 0 ? <p className="text-sm text-muted-foreground">No activity yet.</p> : (
            <ul className="space-y-3">{timeline.map((e) => (
              <li key={e.id} className="flex gap-3 border-b pb-3 last:border-0">
                <div className="mt-0.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{e.subject}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{e.userName} · {formatDateTime(e.createdAt)}</p>
                </div>
              </li>
            ))}</ul>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={cancelDialogOpen}
        onOpenChange={(o) => { if (!o) setCancelDialogOpen(false); }}
        title="Cancel quotation?"
        description={`This will cancel ${q.quoteNumber}. This action cannot be undone.`}
        confirmLabel="Cancel Quotation"
        destructive
        onConfirm={() => { action('cancel'); setCancelDialogOpen(false); }}
      />
    </div>
  );
}

function AddLineItemButton({ quotationId, tenantId, onAdded }: { quotationId: string; tenantId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    serviceType: 'OTHER', title: '', description: '', quantity: 1,
    unitPrice: 0, taxAmount: 0, discountAmount: 0,
  });

  const handleSubmit = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    try {
      await api.post(`/api/v1/tenant/quotations/${quotationId}/line-items`, form, { tenantId });
      toast.success('Line item added');
      setOpen(false);
      setForm({ serviceType: 'OTHER', title: '', description: '', quantity: 1, unitPrice: 0, taxAmount: 0, discountAmount: 0 });
      onAdded();
    } catch (err: any) { toast.error(err.message || 'Failed to add line item'); }
    finally { setSaving(false); }
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />Add Item</Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setOpen(false)}>
          <div className="bg-background rounded-lg shadow-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Add Line Item</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Service Type</label>
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value })}>
                  {SERVICE_TYPES.map((s) => <option key={s} value={s}>{humanizeStatus(s)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Title *</label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Round-trip airfare DAC-JED" />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional details" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Quantity</label>
                  <Input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Math.max(1, Number(e.target.value)) })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Unit Price</label>
                  <Input type="number" min={0} step="0.01" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: Math.max(0, Number(e.target.value)) })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Tax</label>
                  <Input type="number" min={0} step="0.01" value={form.taxAmount} onChange={(e) => setForm({ ...form, taxAmount: Math.max(0, Number(e.target.value)) })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Discount</label>
                  <Input type="number" min={0} step="0.01" value={form.discountAmount} onChange={(e) => setForm({ ...form, discountAmount: Math.max(0, Number(e.target.value)) })} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Adding...' : 'Add Item'}</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function EditLineItemButton({ item, quotationId, tenantId, onSaved }: { item: QuotationLineItem; quotationId: string; tenantId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    serviceType: item.serviceType || 'OTHER',
    title: item.title || '',
    description: item.description || '',
    quantity: item.quantity,
    unitPrice: Number(item.unitPrice),
    taxAmount: Number(item.taxAmount ?? 0),
    discountAmount: Number(item.discountAmount ?? 0),
  });

  const handleSubmit = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    try {
      await api.put(`/api/v1/tenant/quotations/${quotationId}/line-items/${item.id}`, form, { tenantId });
      toast.success('Line item updated');
      setOpen(false);
      onSaved();
    } catch (err: any) { toast.error(err.message || 'Failed to update'); }
    finally { setSaving(false); }
  };

  return (
    <>
      <Button variant="ghost" size="icon" title="Edit" onClick={() => setOpen(true)}><Pencil className="h-4 w-4" /></Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setOpen(false)}>
          <div className="bg-background rounded-lg shadow-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Edit Line Item</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Service Type</label>
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value })}>
                  {SERVICE_TYPES.map((s) => <option key={s} value={s}>{humanizeStatus(s)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Title *</label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Quantity</label>
                  <Input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Math.max(1, Number(e.target.value)) })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Unit Price</label>
                  <Input type="number" min={0} step="0.01" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: Math.max(0, Number(e.target.value)) })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Tax</label>
                  <Input type="number" min={0} step="0.01" value={form.taxAmount} onChange={(e) => setForm({ ...form, taxAmount: Math.max(0, Number(e.target.value)) })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Discount</label>
                  <Input type="number" min={0} step="0.01" value={form.discountAmount} onChange={(e) => setForm({ ...form, discountAmount: Math.max(0, Number(e.target.value)) })} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function DeleteLineItemButton({ item, quotationId, tenantId, onDeleted }: { item: QuotationLineItem; quotationId: string; tenantId: string; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/api/v1/tenant/quotations/${quotationId}/line-items/${item.id}`, { tenantId });
      toast.success('Line item removed');
      setOpen(false);
      onDeleted();
    } catch (err: any) { toast.error(err.message || 'Failed to remove'); }
    finally { setDeleting(false); }
  };

  return (
    <>
      <Button variant="ghost" size="icon" title="Remove" onClick={() => setOpen(true)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
      <ConfirmDialog
        open={open}
        onOpenChange={(o) => { if (!o) setOpen(false); }}
        title="Remove line item?"
        description={`Remove "${item.title}" from this quotation? Totals will be recalculated.`}
        confirmLabel="Remove"
        destructive
        onConfirm={handleDelete}
      />
    </>
  );
}
