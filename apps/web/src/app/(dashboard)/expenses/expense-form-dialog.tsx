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
import { Expense, EXPENSE_STATUSES } from '@/lib/crm';

interface Props { open: boolean; onOpenChange: (o: boolean) => void; expense?: Expense | null; onSaved: () => void; }
interface FormState { expenseNumber: string; category: string; vendorName: string; amount: string; currencyCode: string; status: string; description: string; expenseDate: string; }
const empty: FormState = { expenseNumber: '', category: '', vendorName: '', amount: '0', currencyCode: 'USD', status: 'PENDING', description: '', expenseDate: '' };

export function ExpenseFormDialog({ open, onOpenChange, expense, onSaved }: Props) {
  const { activeTenant } = useAuthStore();
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const isEdit = !!expense;
  useEffect(() => { if (open) { setError(''); setForm(expense ? { expenseNumber: expense.expenseNumber, category: expense.category ?? '', vendorName: expense.vendorName ?? '', amount: String(expense.amount), currencyCode: expense.currencyCode, status: expense.status, description: expense.description ?? '', expenseDate: expense.expenseDate?.split('T')[0] ?? '' } : empty); } }, [open, expense]);
  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!activeTenant || !form.expenseNumber.trim()) { setError('Expense number is required'); return; }
    setSaving(true); setError('');
    const payload = { expenseNumber: form.expenseNumber.trim(), category: form.category.trim() || undefined, vendorName: form.vendorName.trim() || undefined, amount: Number(form.amount) || 0, currencyCode: form.currencyCode, status: form.status, description: form.description.trim() || undefined, expenseDate: form.expenseDate || undefined };
    try {
      if (isEdit && expense) { await api.put(`/api/v1/tenant/expenses/${expense.id}`, payload, { tenantId: activeTenant.id }); toast.success('Expense updated'); }
      else { await api.post('/api/v1/tenant/expenses', payload, { tenantId: activeTenant.id }); toast.success('Expense created'); }
      onOpenChange(false); onSaved();
    } catch (err: any) { setError(err.message); toast.error(err.message); } finally { setSaving(false); }
  };
  return (<Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>{isEdit ? 'Edit Expense' : 'New Expense'}</DialogTitle><DialogDescription>{isEdit ? 'Update expense details.' : 'Record a business expense.'}</DialogDescription></DialogHeader>
    <form onSubmit={handleSubmit} className="space-y-4">{error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
      <div className="space-y-2"><Label htmlFor="expNo">Expense # <span className="text-destructive">*</span></Label><Input id="expNo" value={form.expenseNumber} onChange={(e) => set('expenseNumber', e.target.value)} placeholder="EXP-2026-0001" required /></div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="category">Category</Label><Select value={form.category} onValueChange={(v) => set('category', v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="OFFICE_SUPPLIES">Office Supplies</SelectItem><SelectItem value="TRAVEL">Travel</SelectItem><SelectItem value="MEALS">Meals</SelectItem><SelectItem value="UTILITIES">Utilities</SelectItem><SelectItem value="RENT">Rent</SelectItem><SelectItem value="SALARY">Salary</SelectItem><SelectItem value="OTHER">Other</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label htmlFor="vendorName">Vendor</Label><Input id="vendorName" value={form.vendorName} onChange={(e) => set('vendorName', e.target.value)} /></div></div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3"><div className="space-y-2"><Label htmlFor="amount">Amount</Label><Input id="amount" type="number" value={form.amount} onChange={(e) => set('amount', e.target.value)} /></div><div className="space-y-2"><Label>Currency</Label><Select value={form.currencyCode} onValueChange={(v) => set('currencyCode', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem><SelectItem value="GBP">GBP</SelectItem><SelectItem value="JPY">JPY</SelectItem><SelectItem value="AUD">AUD</SelectItem><SelectItem value="INR">INR</SelectItem><SelectItem value="AED">AED</SelectItem><SelectItem value="SAR">SAR</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Status</Label><Select value={form.status} onValueChange={(v) => set('status', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{EXPENSE_STATUSES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent></Select></div></div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="expenseDate">Expense date</Label><Input id="expenseDate" type="date" value={form.expenseDate} onChange={(e) => set('expenseDate', e.target.value)} /></div></div>
      <div className="space-y-2"><Label htmlFor="description">Description</Label><Textarea id="description" value={form.description} onChange={(e) => set('description', e.target.value)} /></div>
      <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create expense'}</Button></DialogFooter>
    </form></DialogContent></Dialog>);
}
