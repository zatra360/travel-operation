'use client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/ui/select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/ui/page-header';
import { ArrowLeft, Save, Plane, Code, Plus, Trash2, FileText, DollarSign } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Quotation } from '@/lib/crm';
import { humanizeStatus } from '@/lib/status';
import { getDefaultCurrency } from '@/stores/auth-store';
import { useAirports, useCurrencies } from '@/lib/use-ref-data';
import { useLookup } from '@/lib/use-lookup';

interface Props { quotation?: Quotation | null; mode: 'create' | 'edit'; }
interface LineItem { serviceType: string; title: string; description: string; quantity: number; unitPrice: number; sortOrder: number; departureAirportId?: string; arrivalAirportId?: string; }

export default function QuotationForm({ quotation, mode }: Props) {
  const router = useRouter();
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
  const { items: serviceTypes } = useLookup('service-type');
  const { items: quotationStatuses } = useLookup('quotation-status');
  const { options: currencyOptions } = useCurrencies();

  useEffect(() => {
    if (!activeTenant) return;
    Promise.all([
      api.get<any>('/api/v1/tenant/clients?limit=200', { tenantId: activeTenant.id }).catch(() => ({ data: [] })),
      api.get<any>('/api/v1/tenant/leads?limit=200', { tenantId: activeTenant.id }).catch(() => ({ data: [] })),
    ]).then(([c, l]) => { setClients(c.data || []); setLeads(l.data || []); });

    if (quotation && mode === 'edit') {
      setForm({ quoteNumber: quotation.quoteNumber ?? '', title: quotation.title ?? '', status: quotation.status ?? 'DRAFT', currencyCode: quotation.currencyCode || getDefaultCurrency(), validUntil: quotation.validUntil?.split('T')[0] ?? '', notes: quotation.notes ?? '', terms: quotation.terms ?? '', clientId: quotation.clientId || '', leadId: quotation.leadId || '' });
    }
  }, [activeTenant, quotation, mode]);

  const onLeadChange = (leadId: string) => {
    setForm(f => ({ ...f, leadId }));
    if (!leadId || leadId === '__none__' || lineItems.length > 0) return;
    const lead = leads.find((l: any) => l.id === leadId);
    if (!lead || !lead.serviceType) return;
    setLineItems([{ serviceType: lead.serviceType, title: `${lead.serviceType.replace(/_/g, ' ')} — ${lead.destinationCity || ''}`, description: `${lead.numAdults || 1}A ${lead.numChildren || 0}C ${lead.numInfants || 0}I · ${lead.tripType || 'ONE_WAY'}`, quantity: lead.numAdults || 1, unitPrice: Number(lead.potentialRevenue || 0), sortOrder: 1 }]);
  };

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const addItem = () => setLineItems([...lineItems, { serviceType: '', title: '', description: '', quantity: 1, unitPrice: 0, sortOrder: lineItems.length + 1 }]);
  const updItem = (i: number, f: keyof LineItem, v: any) => { const items = [...lineItems]; (items[i] as any)[f] = v; setLineItems(items); };
  const delItem = (i: number) => setLineItems(lineItems.filter((_, idx) => idx !== i));

  const parseGds = () => {
    const lines = gdsText.split('\n').filter(l => l.trim());
    const parsed: LineItem[] = [];
    let seq = lineItems.length;
    for (const line of lines) {
      const m = line.match(/^\d+\s+([A-Z]{2}\d+)\s+(\w)\s+(\d{1,2}[A-Z]{3})\s+(\d{1,2}[A-Z]{3})\s+.*?(\d{4})\s+(\d{4})/);
      if (m) {
        const d = m[4].slice(2, 5) + m[4].slice(0, 2); const a = m[5].slice(2, 5) + m[5].slice(0, 2);
        parsed.push({ serviceType: 'AIR_TICKET', title: `${m[1]} ${m[2]}`, description: `${d}→${a} ${m[6]}-${m[7]}`, quantity: 1, unitPrice: 0, sortOrder: ++seq });
      }
    }
    if (parsed.length) { setLineItems([...lineItems, ...parsed]); toast.success(`Parsed ${parsed.length} segments`); } else toast.error('No segments found');
  };

  const total = lineItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant) return;
    setSaving(true); setError('');
    try {
      const payload: any = { title: form.title || undefined, status: form.status, currencyCode: form.currencyCode, validUntil: form.validUntil || undefined, notes: form.notes || undefined, terms: form.terms || undefined, clientId: form.clientId || undefined, leadId: form.leadId || undefined };
      if (form.quoteNumber.trim()) payload.quoteNumber = form.quoteNumber.trim();

      const m = mode === 'edit' && quotation ? 'put' : 'post';
      const url = mode === 'edit' && quotation ? `/api/v1/tenant/quotations/${quotation.id}` : '/api/v1/tenant/quotations';
      const res = await api[m]<any>(url, payload, { tenantId: activeTenant.id });
      const quoteId = (res as any).id || quotation?.id;

      if (lineItems.length && quoteId) {
        for (const item of lineItems) {
          if (!item.title.trim()) continue;
          await api.post(`/api/v1/tenant/quotations/${quoteId}/line-items`, { ...item, serviceType: item.serviceType || 'OTHER' }, { tenantId: activeTenant.id });
        }
      }
      toast.success(mode === 'edit' ? 'Updated' : `Created with ${lineItems.length} items`);
      router.push(`/quotations/${quoteId}`);
    } catch (err: any) { setError(err.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title={mode === 'edit' ? 'Edit Quotation' : 'New Quotation'} subtitle={quotation ? quotation.quoteNumber : 'Create a quotation with line items'} actions={<Button variant="outline" size="sm" onClick={() => router.back()}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>} />

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" />Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Quote Number</Label><Input value={form.quoteNumber} onChange={e => set('quoteNumber', e.target.value)} placeholder="Auto-generated if empty" className="mt-1" /></div>
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Title</Label><Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Umrah Package" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Lead</Label>
                <Select value={form.leadId || '__none__'} onValueChange={onLeadChange}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="__none__">None</SelectItem>{leads.map(l => <SelectItem key={l.id} value={l.id}>{l.fullName}</SelectItem>)}</SelectContent></Select>
              </div>
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Client</Label>
                <Select value={form.clientId || '__none__'} onValueChange={v => set('clientId', v === '__none__' ? '' : v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="__none__">None</SelectItem>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.displayName}</SelectItem>)}</SelectContent></Select>
              </div>
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Currency</Label>
                <Select value={form.currencyCode} onValueChange={v => set('currencyCode', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{currencyOptions.slice(0, 30).map(c => <SelectItem key={c.hint || c.label} value={c.hint || c.label}>{c.hint} - {c.label}</SelectItem>)}</SelectContent></Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Status</Label>
                <Select value={form.status} onValueChange={v => set('status', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{quotationStatuses.map(s => <SelectItem key={s.code} value={s.code}>{humanizeStatus(s.code)}</SelectItem>)}</SelectContent></Select>
              </div>
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Valid Until</Label><Input type="date" value={form.validUntil} onChange={e => set('validUntil', e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Plane className="h-4 w-4 text-muted-foreground" />Line Items ({lineItems.length})</CardTitle>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowGds(!showGds)}><Code className="h-3 w-3 mr-1" />Parse GDS</Button>
                <Button type="button" size="sm" onClick={addItem}><Plus className="h-3 w-3 mr-1" />Add Item</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {showGds && (
              <div className="border rounded-lg p-3 bg-muted/30">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Paste GDS PNR Output</Label>
                <Textarea value={gdsText} onChange={e => setGdsText(e.target.value)} placeholder=" 1  EK501 Y 15JUL DXBJED HK1  0230  0530&#10; 2  EK502 Y 25JUL JEDDXB HK1  1100  1800" className="font-mono text-xs min-h-[60px]" rows={3} />
                <Button type="button" size="sm" variant="outline" onClick={parseGds} className="mt-2">Parse Segments</Button>
              </div>
            )}

            {lineItems.map((item, i) => (
              <div key={i} className="space-y-2 p-3 rounded-lg border bg-muted/20">
                <div className="flex items-center gap-2">
                  <div className="flex-1 grid grid-cols-12 gap-2">
                    <div className="col-span-3"><Select value={item.serviceType || 'OTHER'} onValueChange={v => updItem(i, 'serviceType', v)}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{serviceTypes.map(s => <SelectItem key={s.code} value={s.code}>{humanizeStatus(s.code)}</SelectItem>)}</SelectContent></Select></div>
                    <div className="col-span-2"><Input type="number" value={item.quantity} onChange={e => updItem(i, 'quantity', Number(e.target.value))} placeholder="Qty" className="h-8 text-xs" min={1} /></div>
                    <div className="col-span-2"><Input type="number" value={item.unitPrice} onChange={e => updItem(i, 'unitPrice', Number(e.target.value))} placeholder="Price" className="h-8 text-xs" step={0.01} /></div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => delItem(i)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                </div>
                {item.serviceType === 'AIR_TICKET' && (
                  <div className="flex items-center gap-2 ml-0">
                    <Combobox options={airportOptions} value={(item as any).departureAirportId || ''} onChange={v => updItem(i, 'departureAirportId' as any, v)} placeholder="From airport" searchPlaceholder="Search..." className="h-7 text-xs flex-1" />
                    <Plane className="h-3 w-3 text-muted-foreground shrink-0" />
                    <Combobox options={airportOptions} value={(item as any).arrivalAirportId || ''} onChange={v => updItem(i, 'arrivalAirportId' as any, v)} placeholder="To airport" searchPlaceholder="Search..." className="h-7 text-xs flex-1" />
                  </div>
                )}
                <Input value={item.title} onChange={e => updItem(i, 'title', e.target.value)} placeholder="Item description" className="h-8 text-xs" />
              </div>
            ))}
            {lineItems.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No line items yet. Add manually, select a lead to auto-fill, or paste GDS output.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4 text-muted-foreground" />Notes & Terms</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Notes</Label><Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} placeholder="Requirements, special pricing..." /></div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Terms</Label><Textarea value={form.terms} onChange={e => set('terms', e.target.value)} rows={3} placeholder="Payment terms, validity..." /></div>
          </CardContent>
        </Card>

        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Total: <span className="font-bold text-lg text-foreground">${total.toFixed(2)} {form.currencyCode}</span></span>
          <div className="flex gap-3">
            <Button type="button" variant="outline" size="lg" onClick={() => router.back()} disabled={saving}>Cancel</Button>
            <Button type="submit" size="lg" disabled={saving}><Save className="h-4 w-4 mr-2" />{saving ? 'Saving...' : mode === 'edit' ? 'Save' : `Create (${lineItems.length} items)`}</Button>
          </div>
        </div>
      </form>
    </div>
  );
}
