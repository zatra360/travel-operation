'use client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/ui/select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Plane, Code } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Quotation } from '@/lib/crm';
import { humanizeStatus } from '@/lib/status';
import { getDefaultCurrency } from '@/stores/auth-store';
import { useCountries, useAirports, useAirlines, useCurrencies } from '@/lib/use-ref-data';
import { useLookup } from '@/lib/use-lookup';

interface Props { open: boolean; onOpenChange: (open: boolean) => void; quotation?: Quotation | null; onSaved: () => void; }

interface LineItem { serviceType: string; title: string; description: string; quantity: number; unitPrice: number; sortOrder: number; }

export function QuotationFormDialog({ open, onOpenChange, quotation, onSaved }: Props) {
  const { activeTenant } = useAuthStore();
  const [form, setForm] = useState({ quoteNumber: '', title: '', status: 'DRAFT', currencyCode: getDefaultCurrency(), validUntil: '', notes: '', terms: '', clientId: '', leadId: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [gdsText, setGdsText] = useState('');
  const [showGds, setShowGds] = useState(false);
  const { options: airportOptions } = useAirports();
  const { options: currencyOptions } = useCurrencies();
  const { items: serviceTypes } = useLookup('service-type');
  const { items: quotationStatuses } = useLookup('quotation-status');
  const isEdit = !!quotation;

  useEffect(() => {
    if (open && activeTenant) {
      setError('');
      Promise.all([
        api.get<any>('/api/v1/tenant/clients?limit=100', { tenantId: activeTenant.id }).catch(() => ({ data: [] })),
        api.get<any>('/api/v1/tenant/leads?limit=100', { tenantId: activeTenant.id }).catch(() => ({ data: [] })),
      ]).then(([c, l]) => { setClients(c.data || []); setLeads(l.data || []); });

      if (quotation) {
        setForm({ quoteNumber: quotation.quoteNumber ?? '', title: quotation.title ?? '', status: quotation.status ?? 'DRAFT',           currencyCode: quotation.currencyCode || getDefaultCurrency(), validUntil: quotation.validUntil?.split('T')[0] ?? '', notes: quotation.notes ?? '', terms: quotation.terms ?? '', clientId: quotation.clientId || '', leadId: quotation.leadId || '' });
        setLineItems([]);
      } else {
        setForm({ quoteNumber: '', title: '', status: 'DRAFT', currencyCode: getDefaultCurrency(), validUntil: '', notes: '', terms: '', clientId: '', leadId: '' });
        setLineItems([]);
      }
      setGdsText(''); setShowGds(false);
    }
  }, [open, quotation, activeTenant]);

  const onLeadChange = (leadId: string) => {
    setForm(f => ({ ...f, leadId }));
    if (!leadId || leadId === '__none__') return;
    const lead = leads.find((l: any) => l.id === leadId);
    if (!lead || lineItems.length > 0) return;
    if (lead.serviceType) {
      setLineItems([{ serviceType: lead.serviceType, title: `${lead.serviceType} — ${lead.destinationCity || ''}`, description: `${lead.numAdults || 1}A ${lead.numChildren || 0}C ${lead.numInfants || 0}I · ${lead.tripType || 'ONE_WAY'}`, quantity: lead.numAdults || 1, unitPrice: Number(lead.potentialRevenue || 0), sortOrder: 1 }]);
    }
  };

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const addLineItem = () => setLineItems([...lineItems, { serviceType: '', title: '', description: '', quantity: 1, unitPrice: 0, sortOrder: lineItems.length + 1 }]);
  const updateLineItem = (i: number, field: keyof LineItem, value: any) => { const items = [...lineItems]; (items[i] as any)[field] = value; setLineItems(items); };
  const removeLineItem = (i: number) => setLineItems(lineItems.filter((_, idx) => idx !== i));

  const parseGds = () => {
    const lines = gdsText.split('\n').filter(l => l.trim());
    const parsed: LineItem[] = [];
    let seq = lineItems.length;
    for (const line of lines) {
      const segMatch = line.match(/^\d+\s+([A-Z]{2}\d+)\s+(\w)\s+(\d{1,2}[A-Z]{3})\s+(\d{1,2}[A-Z]{3})\s+.*?(\d{4})\s+(\d{4})/);
      if (segMatch) {
        const dep = segMatch[4].slice(2, 5) + segMatch[4].slice(0, 2);
        const arr = segMatch[5].slice(2, 5) + segMatch[5].slice(0, 2);
        parsed.push({ serviceType: 'AIR_TICKET', title: `${segMatch[1]} ${segMatch[2]}`, description: `${dep} → ${arr} ${segMatch[6]}-${segMatch[7]}`, quantity: 1, unitPrice: 0, sortOrder: ++seq });
        continue;
      }
      const fareMatch = line.match(/fare|base|total|amount/i);
      if (fareMatch || line.match(/^\s*[\d.]+$/)) continue;
      if (line.trim()) parsed.push({ serviceType: 'OTHER', title: line.trim().substring(0, 50), description: '', quantity: 1, unitPrice: 0, sortOrder: ++seq });
    }
    if (parsed.length > 0) { setLineItems([...lineItems, ...parsed]); toast.success(`Parsed ${parsed.length} items`); }
    else toast.error('No valid segments found');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant) return;
    if (!form.quoteNumber.trim()) { setError('Quote number is required'); return; }
    setSaving(true); setError('');

    try {
      const payload = { quoteNumber: form.quoteNumber, title: form.title || undefined, status: form.status, currencyCode: form.currencyCode, validUntil: form.validUntil || undefined, notes: form.notes || undefined, terms: form.terms || undefined, clientId: form.clientId || undefined, leadId: form.leadId || undefined };

      const method = isEdit && quotation ? 'put' : 'post';
      const url = isEdit && quotation ? `/api/v1/tenant/quotations/${quotation.id}` : '/api/v1/tenant/quotations';
      const res = await api[method]<any>(url, payload, { tenantId: activeTenant.id });
      const quoteId = (res as any).id || quotation?.id;

      if (lineItems.length > 0 && quoteId) {
        for (const item of lineItems) {
          if (!item.title.trim()) continue;
          await api.post(`/api/v1/tenant/quotations/${quoteId}/line-items`, { ...item, serviceType: item.serviceType || 'OTHER' }, { tenantId: activeTenant.id });
        }
      }

      toast.success(isEdit ? 'Quotation updated' : `Quotation created with ${lineItems.length} line items`);
      onOpenChange(false); onSaved();
    } catch (err: any) { setError(err.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Quotation' : 'New Quotation'}</DialogTitle>
          <DialogDescription>{isEdit ? 'Update details' : 'Create a quotation with line items'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quote # *</Label><Input value={form.quoteNumber} onChange={e => set('quoteNumber', e.target.value)} placeholder="QTN-2026-0001" required className="mt-1" /></div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title</Label><Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Umrah Package" className="mt-1" /></div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lead</Label>
              <Select value={form.leadId || '__none__'} onValueChange={onLeadChange}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select lead" /></SelectTrigger>
                <SelectContent><SelectItem value="__none__">None</SelectItem>{leads.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.fullName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Client</Label>
              <Select value={form.clientId || '__none__'} onValueChange={v => set('clientId', v === '__none__' ? '' : v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent><SelectItem value="__none__">None</SelectItem>{clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.displayName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Currency</Label>
              <Select value={form.currencyCode} onValueChange={v => set('currencyCode', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{currencyOptions.slice(0, 30).map(c => <SelectItem key={c.hint || c.label} value={c.hint || c.label}>{c.hint} - {c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</Label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{quotationStatuses.map(s => <SelectItem key={s.code} value={s.code}>{humanizeStatus(s.code)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Valid Until</Label><Input type="date" value={form.validUntil} onChange={e => set('validUntil', e.target.value)} className="mt-1" /></div>
          </div>

          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Plane className="h-3 w-3" />Line Items ({lineItems.length})
              </Label>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowGds(!showGds)}><Code className="h-3 w-3 mr-1" />GDS</Button>
                <Button type="button" size="sm" onClick={addLineItem}><Plus className="h-3 w-3 mr-1" />Add</Button>
              </div>
            </div>

            {showGds && (
              <div className="mb-3 border rounded-lg p-3 bg-muted/30">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Paste GDS Output</Label>
                <Textarea value={gdsText} onChange={e => setGdsText(e.target.value)} placeholder=" 1  EK501 Y 15JUL DXBJED HK1  0230  0530&#10; 2  EK502 Y 25JUL JEDDXB HK1  1100  1800" className="font-mono text-xs min-h-[60px]" rows={3} />
                <Button type="button" size="sm" variant="outline" onClick={parseGds} className="mt-2">Parse into line items</Button>
              </div>
            )}

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {lineItems.map((item, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg border bg-muted/20">
                  <div className="flex-1 grid grid-cols-12 gap-2">
                    <div className="col-span-3">
                      <Select value={item.serviceType || 'OTHER'} onValueChange={v => updateLineItem(i, 'serviceType', v)}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{serviceTypes.map(s => <SelectItem key={s.code} value={s.code}>{humanizeStatus(s.code)}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-4"><Input value={item.title} onChange={e => updateLineItem(i, 'title', e.target.value)} placeholder="Title" className="h-7 text-xs" /></div>
                    <div className="col-span-2"><Input type="number" value={item.quantity} onChange={e => updateLineItem(i, 'quantity', Number(e.target.value))} placeholder="Qty" className="h-7 text-xs" min={1} /></div>
                    <div className="col-span-2"><Input type="number" value={item.unitPrice} onChange={e => updateLineItem(i, 'unitPrice', Number(e.target.value))} placeholder="Price" className="h-7 text-xs" min={0} step={0.01} /></div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeLineItem(i)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                </div>
              ))}
              {lineItems.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">No line items. Add manually or select a lead to auto-fill.</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</Label><Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className="mt-1" /></div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Terms</Label><Textarea value={form.terms} onChange={e => set('terms', e.target.value)} rows={2} className="mt-1" /></div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Save' : `Create with ${lineItems.length} items`}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
