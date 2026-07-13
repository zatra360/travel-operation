'use client';
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
  quoteNumber: string; title: string; status: string; currencyCode: string;
  validUntil: string; notes: string; terms: string; clientId: string; leadId: string;
}

const empty: FormState = {
  quoteNumber: '', title: '', status: 'DRAFT', currencyCode: 'USD',
  validUntil: '', notes: '', terms: '', clientId: '', leadId: '',
};

export function QuotationFormDialog({ open, onOpenChange, quotation, onSaved }: Props) {
  const { activeTenant } = useAuthStore();
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const isEdit = !!quotation;

  useEffect(() => {
    if (open && activeTenant) {
      setError('');
      Promise.all([
        api.get<any>('/api/v1/tenant/clients?limit=100', { tenantId: activeTenant.id }).catch(() => ({ data: [] })),
        api.get<any>('/api/v1/tenant/leads?limit=100', { tenantId: activeTenant.id }).catch(() => ({ data: [] })),
      ]).then(([c, l]) => { setClients(c.data || []); setLeads(l.data || []); });
      setForm(
        quotation ? {
          quoteNumber: quotation.quoteNumber ?? '', title: quotation.title ?? '',
          status: quotation.status ?? 'DRAFT', currencyCode: quotation.currencyCode ?? 'USD',
          validUntil: quotation.validUntil?.split('T')[0] ?? '', notes: quotation.notes ?? '',
          terms: quotation.terms ?? '', clientId: quotation.clientId || '', leadId: quotation.leadId || '',
        } : empty,
      );
    }
  }, [open, quotation, activeTenant]);

  const set = (key: keyof FormState, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant) return;
    if (!form.quoteNumber.trim()) { setError('Quote number is required'); return; }
    setSaving(true); setError('');
    try {
      if (isEdit && quotation) {
        await api.put(`/api/v1/tenant/quotations/${quotation.id}`, {
          quoteNumber: form.quoteNumber, title: form.title || undefined,
          status: form.status, currencyCode: form.currencyCode,
          validUntil: form.validUntil || undefined, notes: form.notes || undefined,
          terms: form.terms || undefined, clientId: form.clientId || undefined,
          leadId: form.leadId || undefined,
        }, { tenantId: activeTenant.id });
        toast.success('Quotation updated');
      } else {
        await api.post('/api/v1/tenant/quotations', {
          quoteNumber: form.quoteNumber, title: form.title || undefined,
          status: form.status, currencyCode: form.currencyCode,
          validUntil: form.validUntil || undefined, notes: form.notes || undefined,
          terms: form.terms || undefined, clientId: form.clientId || undefined,
          leadId: form.leadId || undefined,
        }, { tenantId: activeTenant.id });
        toast.success('Quotation created — add line items on the detail page');
      }
      onOpenChange(false); onSaved();
    } catch (err: any) { setError(err.message || 'Failed'); toast.error(err.message || 'Failed'); }
    finally { setSaving(false); }
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
          {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          <div className="space-y-2">
            <Label>Quote number <span className="text-destructive">*</span></Label>
            <Input value={form.quoteNumber} onChange={(e) => set('quoteNumber', e.target.value)} placeholder="QTN-2026-0001" required />
          </div>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Umrah Package January" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={form.clientId || '__none__'} onValueChange={(v) => set('clientId', v === '__none__' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.displayName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Lead</Label>
              <Select value={form.leadId || '__none__'} onValueChange={(v) => set('leadId', v === '__none__' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Select lead" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {leads.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.fullName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {QUOTATION_STATUSES.map((s) => <SelectItem key={s} value={s}>{humanizeStatus(s)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={form.currencyCode} onValueChange={(v) => set('currencyCode', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['USD','EUR','GBP','JPY','AUD','INR','AED','SAR','BDT','SGD'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Valid until</Label>
            <Input type="date" value={form.validUntil} onChange={(e) => set('validUntil', e.target.value)} />
          </div>
          <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} /></div>
          <div className="space-y-2"><Label>Terms</Label><Textarea value={form.terms} onChange={(e) => set('terms', e.target.value)} /></div>
          {!isEdit && <p className="text-xs text-muted-foreground">After creating, open the quotation to add line items. Totals are calculated automatically.</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create quotation'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
