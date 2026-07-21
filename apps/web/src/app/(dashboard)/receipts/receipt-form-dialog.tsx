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
import { Receipt } from '@/lib/crm';

interface Props { open: boolean; onOpenChange: (o: boolean) => void; receipt?: Receipt | null; onSaved: () => void; }
interface FormState { receiptNumber: string; invoiceId: string; paymentMethod: string; amount: string; currencyCode: string; reference: string; notes: string; receivedAt: string; }
import { getDefaultCurrency } from '@/stores/auth-store';
const empty: FormState = { receiptNumber: '', invoiceId: '', paymentMethod: '', amount: '0', currencyCode: getDefaultCurrency(), reference: '', notes: '', receivedAt: '' };

export function ReceiptFormDialog({ open, onOpenChange, receipt, onSaved }: Props) {
  const { activeTenant } = useAuthStore();
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const isEdit = !!receipt;
  useEffect(() => { if (open) { setError(''); setForm(receipt ? { receiptNumber: receipt.receiptNumber, invoiceId: receipt.invoiceId ?? '', paymentMethod: receipt.paymentMethod ?? '', amount: String(receipt.amount), currencyCode: receipt.currencyCode, reference: receipt.reference ?? '', notes: receipt.notes ?? '', receivedAt: receipt.receivedAt?.split('T')[0] ?? '' } : empty); } }, [open, receipt]);
  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!activeTenant || !form.receiptNumber.trim()) { setError('Receipt number is required'); return; }
    setSaving(true); setError('');
    const payload = { receiptNumber: form.receiptNumber.trim(), invoiceId: form.invoiceId.trim() || undefined, paymentMethod: form.paymentMethod.trim() || undefined, amount: Number(form.amount) || 0, currencyCode: form.currencyCode, reference: form.reference.trim() || undefined, notes: form.notes.trim() || undefined, receivedAt: form.receivedAt || undefined };
    try {
      if (isEdit && receipt) { await api.put(`/api/v1/tenant/receipts/${receipt.id}`, payload, { tenantId: activeTenant.id }); toast.success('Receipt updated'); }
      else { await api.post('/api/v1/tenant/receipts', payload, { tenantId: activeTenant.id }); toast.success('Receipt created'); }
      onOpenChange(false); onSaved();
    } catch (err: any) { setError(err.message); toast.error(err.message); }
    finally { setSaving(false); }
  };
  return (<Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>{isEdit ? 'Edit Receipt' : 'New Receipt'}</DialogTitle><DialogDescription>{isEdit ? 'Update receipt details.' : 'Record a payment receipt.'}</DialogDescription></DialogHeader>
    <form onSubmit={handleSubmit} className="space-y-4">{error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
      <div className="space-y-2"><Label htmlFor="rcpNo">Receipt # <span className="text-destructive">*</span></Label><Input id="rcpNo" value={form.receiptNumber} onChange={(e) => set('receiptNumber', e.target.value)} placeholder="RCP-2026-0001" required /></div>
      <div className="space-y-2"><Label htmlFor="invoiceId">Invoice ID</Label><Input id="invoiceId" value={form.invoiceId} onChange={(e) => set('invoiceId', e.target.value)} /></div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="amount">Amount</Label><Input id="amount" type="number" value={form.amount} onChange={(e) => set('amount', e.target.value)} /></div><div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Currency</Label><Select value={form.currencyCode} onValueChange={(v) => set('currencyCode', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem><SelectItem value="GBP">GBP</SelectItem><SelectItem value="JPY">JPY</SelectItem><SelectItem value="AUD">AUD</SelectItem><SelectItem value="INR">INR</SelectItem><SelectItem value="AED">AED</SelectItem><SelectItem value="SAR">SAR</SelectItem></SelectContent></Select></div></div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="paymentMethod">Payment method</Label><Select value={form.paymentMethod} onValueChange={(v) => set('paymentMethod', v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="CASH">Cash</SelectItem><SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem><SelectItem value="CHEQUE">Cheque</SelectItem><SelectItem value="CARD">Card</SelectItem><SelectItem value="MOBILE">Mobile</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label htmlFor="reference">Reference</Label><Input id="reference" value={form.reference} onChange={(e) => set('reference', e.target.value)} /></div></div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="receivedAt">Received date</Label><Input id="receivedAt" type="date" value={form.receivedAt} onChange={(e) => set('receivedAt', e.target.value)} /></div></div>
      <div className="space-y-2"><Label htmlFor="notes">Notes</Label><Textarea id="notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} /></div>
      <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create receipt'}</Button></DialogFooter>
    </form></DialogContent></Dialog>);
}
