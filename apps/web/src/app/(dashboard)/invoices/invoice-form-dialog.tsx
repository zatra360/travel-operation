import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Invoice, INVOICE_STATUSES } from '@/lib/crm';

interface Props { open: boolean; onOpenChange: (o: boolean) => void; invoice?: Invoice | null; onSaved: () => void; }

interface FormState { invoiceNumber: string; status: string; currencyCode: string; subtotal: string; taxAmount: string; discountAmount: string; totalAmount: string; paidAmount: string; dueAmount: string; issuedAt: string; dueAt: string; notes: string; }

const empty: FormState = { invoiceNumber: '', status: 'DRAFT', currencyCode: 'USD', subtotal: '0', taxAmount: '0', discountAmount: '0', totalAmount: '0', paidAmount: '0', dueAmount: '0', issuedAt: '', dueAt: '', notes: '' };

export function InvoiceFormDialog({ open, onOpenChange, invoice, onSaved }: Props) {
  const { activeTenant } = useAuthStore();
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isEdit = !!invoice;

  useEffect(() => {
    if (open) { setError(''); setForm(invoice ? { invoiceNumber: invoice.invoiceNumber, status: invoice.status, currencyCode: invoice.currencyCode, subtotal: String(invoice.subtotal), taxAmount: String(invoice.taxAmount), discountAmount: String(invoice.discountAmount), totalAmount: String(invoice.totalAmount), paidAmount: String(invoice.paidAmount), dueAmount: String(invoice.dueAmount), issuedAt: invoice.issuedAt?.split('T')[0] ?? '', dueAt: invoice.dueAt?.split('T')[0] ?? '', notes: invoice.notes ?? '' } : empty); }
  }, [open, invoice]);

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!activeTenant) return;
    if (!form.invoiceNumber.trim()) { setError('Invoice number is required'); return; }
    setSaving(true); setError('');
    const payload = { invoiceNumber: form.invoiceNumber.trim(), status: form.status, currencyCode: form.currencyCode, subtotal: Number(form.subtotal) || 0, taxAmount: Number(form.taxAmount) || 0, discountAmount: Number(form.discountAmount) || 0, totalAmount: Number(form.totalAmount) || 0, paidAmount: Number(form.paidAmount) || 0, dueAmount: Number(form.dueAmount) || 0, issuedAt: form.issuedAt || undefined, dueAt: form.dueAt || undefined, notes: form.notes.trim() || undefined };
    try {
      if (isEdit && invoice) { await api.put(`/api/v1/tenant/invoices/${invoice.id}`, payload, { tenantId: activeTenant.id }); toast.success('Invoice updated'); }
      else { await api.post('/api/v1/tenant/invoices', payload, { tenantId: activeTenant.id }); toast.success('Invoice created'); }
      onOpenChange(false); onSaved();
    } catch (err: any) { setError(err.message || 'Failed'); toast.error(err.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (<Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>{isEdit ? 'Edit Invoice' : 'New Invoice'}</DialogTitle><DialogDescription>{isEdit ? 'Update invoice details.' : 'Create a new invoice.'}</DialogDescription></DialogHeader>
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
      <div className="space-y-2"><Label htmlFor="invNo">Invoice # <span className="text-destructive">*</span></Label><Input id="invNo" value={form.invoiceNumber} onChange={(e) => set('invoiceNumber', e.target.value)} placeholder="INV-2026-0001" required /></div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label>Status</Label><Select value={form.status} onValueChange={(v) => set('status', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{INVOICE_STATUSES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Currency</Label><Select value={form.currencyCode} onValueChange={(v) => set('currencyCode', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="BDT">BDT</SelectItem><SelectItem value="EUR">EUR</SelectItem><SelectItem value="GBP">GBP</SelectItem></SelectContent></Select></div>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {(['subtotal','taxAmount','discountAmount','totalAmount','paidAmount','dueAmount'] as const).map((k) => (<div key={k} className="space-y-2"><Label htmlFor={k}>{k.replace(/([A-Z])/g,' $1').replace(/^./, s => s.toUpperCase())}</Label><Input id={k} type="number" value={form[k]} onChange={(e) => set(k, e.target.value)} /></div>))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="issuedAt">Issued date</Label><Input id="issuedAt" type="date" value={form.issuedAt} onChange={(e) => set('issuedAt', e.target.value)} /></div><div className="space-y-2"><Label htmlFor="dueAt">Due date</Label><Input id="dueAt" type="date" value={form.dueAt} onChange={(e) => set('dueAt', e.target.value)} /></div></div>
      <div className="space-y-2"><Label htmlFor="notes">Notes</Label><Textarea id="notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} /></div>
      <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create invoice'}</Button></DialogFooter>
    </form></DialogContent></Dialog>);
}
