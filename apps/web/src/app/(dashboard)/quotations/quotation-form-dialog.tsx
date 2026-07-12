import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Quotation, QUOTATION_STATUSES } from '@/lib/crm';
import { humanizeStatus } from '@/lib/status';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotation?: Quotation | null;
  onSaved: () => void;
}

interface FormState {
  quoteNumber: string;
  title: string;
  status: string;
  currencyCode: string;
  validUntil: string;
  notes: string;
  terms: string;
}

const empty: FormState = {
  quoteNumber: '',
  title: '',
  status: 'DRAFT',
  currencyCode: 'USD',
  validUntil: '',
  notes: '',
  terms: '',
};

export function QuotationFormDialog({ open, onOpenChange, quotation, onSaved }: Props) {
  const { activeTenant } = useAuthStore();
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isEdit = !!quotation;

  useEffect(() => {
    if (open) {
      setError('');
      setForm(
        quotation
          ? {
              quoteNumber: quotation.quoteNumber ?? '',
              title: quotation.title ?? '',
              status: quotation.status ?? 'DRAFT',
              currencyCode: quotation.currencyCode ?? 'USD',
              validUntil: quotation.validUntil?.split('T')[0] ?? '',
              notes: quotation.notes ?? '',
              terms: quotation.terms ?? '',
            }
          : empty,
      );
    }
  }, [open, quotation]);

  const set = (key: keyof FormState, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant) return;
    if (!form.quoteNumber.trim()) {
      setError('Quote number is required');
      return;
    }
    setSaving(true);
    setError('');

    const payload = {
      quoteNumber: form.quoteNumber.trim(),
      title: form.title.trim() || undefined,
      status: form.status,
      currencyCode: form.currencyCode,
      validUntil: form.validUntil || undefined,
      notes: form.notes.trim() || undefined,
      terms: form.terms.trim() || undefined,
    };

    try {
      if (isEdit && quotation) {
        await api.put(`/api/v1/tenant/quotations/${quotation.id}`, payload, { tenantId: activeTenant.id });
        toast.success('Quotation updated');
      } else {
        await api.post('/api/v1/tenant/quotations', payload, { tenantId: activeTenant.id });
        toast.success('Quotation created — add line items on the detail page');
      }
      onOpenChange(false);
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to save quotation');
      toast.error(err.message || 'Failed to save quotation');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Quotation' : 'New Quotation'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update quotation metadata. Totals are calculated from line items.' : 'Create a quotation, then add line items on the detail page.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}

          <div className="space-y-2">
            <Label htmlFor="quoteNumber">Quote number <span className="text-destructive">*</span></Label>
            <Input id="quoteNumber" value={form.quoteNumber} onChange={(e) => set('quoteNumber', e.target.value)} placeholder="QTN-2026-0001" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Umrah Package January" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {QUOTATION_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{humanizeStatus(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={form.currencyCode} onValueChange={(v) => set('currencyCode', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['USD','EUR','GBP','JPY','AUD','INR','AED','SAR','BDT','SGD'].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="validUntil">Valid until</Label>
            <Input id="validUntil" type="date" value={form.validUntil} onChange={(e) => set('validUntil', e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Additional notes..." />
          </div>

          <div className="space-y-2">
            <Label htmlFor="terms">Terms</Label>
            <Textarea id="terms" value={form.terms} onChange={(e) => set('terms', e.target.value)} placeholder="Terms and conditions..." />
          </div>

          {!isEdit && (
            <p className="text-xs text-muted-foreground">
              After creating this quotation, open it to add line items. Totals are calculated automatically.
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create quotation'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
