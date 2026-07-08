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
import { Payment, PAYMENT_STATUSES } from '@/lib/crm';

interface Props { open: boolean; onOpenChange: (o: boolean) => void; payment?: Payment | null; onSaved: () => void; }
interface FormState { bookingId: string; invoiceId: string; amount: string; currencyCode: string; paymentMethod: string; status: string; reference: string; notes: string; receivedAt: string; }
const empty: FormState = { bookingId: '', invoiceId: '', amount: '0', currencyCode: 'USD', paymentMethod: '', status: 'PENDING', reference: '', notes: '', receivedAt: '' };

export function PaymentFormDialog({ open, onOpenChange, payment, onSaved }: Props) {
  const { activeTenant } = useAuthStore();
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const isEdit = !!payment;
  useEffect(() => { if (open) { setError(''); setForm(payment ? { bookingId: payment.bookingId ?? '', invoiceId: payment.invoiceId ?? '', amount: String(payment.amount), currencyCode: payment.currencyCode, paymentMethod: payment.paymentMethod ?? '', status: payment.status, reference: payment.reference ?? '', notes: payment.notes ?? '', receivedAt: payment.receivedAt?.split('T')[0] ?? '' } : empty); } }, [open, payment]);
  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!activeTenant) return;
    setSaving(true); setError('');
    const payload = { bookingId: form.bookingId.trim() || undefined, invoiceId: form.invoiceId.trim() || undefined, amount: Number(form.amount) || 0, currencyCode: form.currencyCode, paymentMethod: form.paymentMethod.trim() || undefined, status: form.status, reference: form.reference.trim() || undefined, notes: form.notes.trim() || undefined, receivedAt: form.receivedAt || undefined };
    try {
      if (isEdit && payment) { await api.put(`/api/v1/tenant/payments/${payment.id}`, payload, { tenantId: activeTenant.id }); toast.success('Payment updated'); }
      else { await api.post('/api/v1/tenant/payments', payload, { tenantId: activeTenant.id }); toast.success('Payment created'); }
      onOpenChange(false); onSaved();
    } catch (err: any) { setError(err.message); toast.error(err.message); }
    finally { setSaving(false); }
  };
  return (<Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>{isEdit ? 'Edit Payment' : 'New Payment'}</DialogTitle><DialogDescription>{isEdit ? 'Update payment details.' : 'Record a new payment.'}</DialogDescription></DialogHeader>
    <form onSubmit={handleSubmit} className="space-y-4">{error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="bookingId">Booking ID</Label><Input id="bookingId" value={form.bookingId} onChange={(e) => set('bookingId', e.target.value)} /></div><div className="space-y-2"><Label htmlFor="invoiceId">Invoice ID</Label><Input id="invoiceId" value={form.invoiceId} onChange={(e) => set('invoiceId', e.target.value)} /></div></div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3"><div className="space-y-2"><Label htmlFor="amount">Amount</Label><Input id="amount" type="number" value={form.amount} onChange={(e) => set('amount', e.target.value)} /></div><div className="space-y-2"><Label>Currency</Label><Select value={form.currencyCode} onValueChange={(v) => set('currencyCode', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem><SelectItem value="GBP">GBP</SelectItem><SelectItem value="JPY">JPY</SelectItem><SelectItem value="AUD">AUD</SelectItem><SelectItem value="INR">INR</SelectItem><SelectItem value="AED">AED</SelectItem><SelectItem value="SAR">SAR</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Status</Label><Select value={form.status} onValueChange={(v) => set('status', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PAYMENT_STATUSES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent></Select></div></div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="paymentMethod">Method</Label><Select value={form.paymentMethod} onValueChange={(v) => set('paymentMethod', v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="CASH">Cash</SelectItem><SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem><SelectItem value="CARD">Card</SelectItem><SelectItem value="MOBILE">Mobile</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label htmlFor="reference">Reference</Label><Input id="reference" value={form.reference} onChange={(e) => set('reference', e.target.value)} /></div></div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="receivedAt">Received date</Label><Input id="receivedAt" type="date" value={form.receivedAt} onChange={(e) => set('receivedAt', e.target.value)} /></div></div>
      <div className="space-y-2"><Label htmlFor="notes">Notes</Label><Textarea id="notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} /></div>
      <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create payment'}</Button></DialogFooter>
    </form></DialogContent></Dialog>);
}
