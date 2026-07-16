'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/ui/select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Client, CLIENT_TYPES, CLIENT_STATUSES, CLIENT_GENDERS } from '@/lib/crm';
import { useCountries, useNationalities } from '@/lib/use-ref-data';
import { getDefaultCurrency } from '@/stores/auth-store';
import { AlertCircle } from 'lucide-react';

interface DuplicateMatch { id: string; name: string; type: 'client' | 'lead'; matchOn: string; phone?: string; }

interface Props { open: boolean; onOpenChange: (open: boolean) => void; client?: Client | null; onSaved: () => void; }

export function ClientFormDialog({ open, onOpenChange, client, onSaved }: Props) {
  const { activeTenant } = useAuthStore();
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const { options: countryOpts } = useCountries();
  const { options: nationalityOpts } = useNationalities();
  const isEdit = !!client;
  const checkTimer = useRef<any>(null);

  const checkDuplicates = useCallback((email: string, phone: string) => {
    if (!activeTenant) return;
    if (!email.trim() && !phone.trim()) { setDuplicates([]); return; }
    clearTimeout(checkTimer.current);
    checkTimer.current = setTimeout(async () => {
      try {
        const res = await api.post('/api/v1/tenant/clients/check-duplicates', { email: email.trim() || undefined, phone: phone.trim() || undefined, excludeId: client?.id }, { tenantId: activeTenant.id });
        setDuplicates((res as any).data?.duplicates ?? []);
      } catch { setDuplicates([]); }
    }, 500);
  }, [activeTenant, client?.id]);

  const set = (key: string, value: string) => {
    setForm((f: any) => {
      const next = { ...f, [key]: value };
      if (key === 'email') checkDuplicates(value, next.phone);
      if (key === 'phone') checkDuplicates(next.email, value);
      return next;
    });
  };

  useEffect(() => {
    if (open) {
      setError('');
      if (client) {
        setForm({
          displayName: client.displayName ?? '', type: client.type ?? 'PERSON', status: client.status ?? 'ACTIVE',
          email: client.email ?? '', phone: client.phone ?? '', whatsapp: client.whatsapp ?? '',
          companyName: client.companyName ?? '', gender: client.gender ?? '',
          dateOfBirth: client.dateOfBirth?.slice(0, 10) ?? '',
          nationalityId: client.nationalityId ?? '', country: client.country ?? '', city: client.city ?? '',
          profession: client.profession ?? '', address: client.address ?? '',
          language: client.language ?? '', preferredCommunication: client.preferredCommunication ?? '',
          preferredPaymentMethod: client.preferredPaymentMethod ?? '',
          preferredAirlines: client.preferredAirlines ?? '', preferredRoutes: client.preferredRoutes ?? '',
          loyaltyStatus: client.loyaltyStatus ?? '', b2bCreditStatus: client.b2bCreditStatus ?? '',
          leadSource: client.leadSource ?? '', notes: (client as any).notes ?? '',
        });
      } else {
        setForm({ displayName: '', type: 'PERSON', status: 'ACTIVE', email: '', phone: '', whatsapp: '', companyName: '', gender: '', dateOfBirth: '', nationalityId: '', country: '', city: '', profession: '', address: '', language: '', preferredCommunication: '', preferredPaymentMethod: '', preferredAirlines: '', preferredRoutes: '', loyaltyStatus: '', b2bCreditStatus: '', leadSource: '', notes: '' });
      }
    }
  }, [open, client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!activeTenant) return;
    if (!form.displayName?.trim()) { setError('Display name is required'); return; }
    setSaving(true); setError('');
    try {
      const payload: any = { displayName: form.displayName.trim(), type: form.type, status: form.status, currencyCode: getDefaultCurrency(), email: form.email?.trim() || undefined, phone: form.phone?.trim() || undefined, whatsapp: form.whatsapp?.trim() || undefined, companyName: form.companyName?.trim() || undefined, gender: form.gender || undefined, dateOfBirth: form.dateOfBirth || undefined, nationalityId: form.nationalityId || undefined, country: form.country || undefined, city: form.city?.trim() || undefined, profession: form.profession?.trim() || undefined, address: form.address?.trim() || undefined, language: form.language?.trim() || undefined, preferredCommunication: form.preferredCommunication || undefined, preferredPaymentMethod: form.preferredPaymentMethod || undefined, preferredAirlines: form.preferredAirlines?.trim() || undefined, preferredRoutes: form.preferredRoutes?.trim() || undefined, loyaltyStatus: form.loyaltyStatus || undefined, b2bCreditStatus: form.b2bCreditStatus || undefined, leadSource: form.leadSource?.trim() || undefined, notes: form.notes?.trim() || undefined };
      if (isEdit && client) { await api.put(`/api/v1/tenant/clients/${client.id}`, payload, { tenantId: activeTenant.id }); toast.success('Updated'); }
      else { await api.post('/api/v1/tenant/clients', payload, { tenantId: activeTenant.id }); toast.success('Created'); }
      onOpenChange(false); onSaved();
    } catch (err: any) { setError(err.message || 'Failed'); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? 'Edit Client' : 'New Client'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Display Name <span className="text-destructive">*</span></Label>
            <Input value={form.displayName || ''} onChange={e => set('displayName', e.target.value)} placeholder="Jane Smith" required className="mt-1" />
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</Label><Select value={form.type} onValueChange={v => set('type', v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{CLIENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</Label><Select value={form.status} onValueChange={v => set('status', v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{CLIENT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gender</Label><Select value={form.gender} onValueChange={v => set('gender', v)}><SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{CLIENT_GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Language</Label><Input value={form.language || ''} onChange={e => set('language', e.target.value)} placeholder="en" className="mt-1" /></div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</Label><Input type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} placeholder="jane@example.com" className="mt-1" /></div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone</Label><Input value={form.phone || ''} onChange={e => set('phone', e.target.value)} placeholder="+1 234 567 8900" className="mt-1" /></div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">WhatsApp</Label><Input value={form.whatsapp || ''} onChange={e => set('whatsapp', e.target.value)} placeholder="+1 234 567 8900" className="mt-1" /></div>
          </div>

          {duplicates.length > 0 && (
            <div className="rounded-md border border-amber-500/50 bg-amber-50 p-3 dark:bg-amber-950/30">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm font-medium mb-2"><AlertCircle className="h-4 w-4" /> Similar Contact Found</div>
              {duplicates.map((d, i) => (
                <div key={i} className="text-xs text-amber-600 dark:text-amber-300 ml-6">
                  <strong>{d.name}</strong> ({d.type === 'client' ? 'Client' : 'Lead'}) — matched on {d.matchOn}
                  {d.phone && <> · {d.phone}</>}
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-4 gap-3">
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nationality</Label><Combobox options={nationalityOpts} value={form.nationalityId || ''} onChange={v => set('nationalityId', v)} placeholder="Select..." searchPlaceholder="..." className="mt-1" /></div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Country</Label><Combobox options={countryOpts.map(o => ({ value: o.label, label: o.label }))} value={form.country || ''} onChange={v => set('country', v)} placeholder="Select..." searchPlaceholder="..." className="mt-1" /></div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">City</Label><Input value={form.city || ''} onChange={e => set('city', e.target.value)} placeholder="New York" className="mt-1" /></div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">DOB</Label><Input type="date" value={form.dateOfBirth || ''} onChange={e => set('dateOfBirth', e.target.value)} className="mt-1" /></div>
          </div>

          {form.type === 'COMPANY' && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Company Name</Label><Input value={form.companyName || ''} onChange={e => set('companyName', e.target.value)} placeholder="Acme Travels" className="mt-1" /></div>
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Profession</Label><Input value={form.profession || ''} onChange={e => set('profession', e.target.value)} placeholder="Business" className="mt-1" /></div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Address</Label><Input value={form.address || ''} onChange={e => set('address', e.target.value)} placeholder="123 Main St" className="mt-1" /></div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payment Method</Label><Select value={form.preferredPaymentMethod || ''} onValueChange={v => set('preferredPaymentMethod', v)}><SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="CASH">Cash</SelectItem><SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem><SelectItem value="CREDIT_CARD">Credit Card</SelectItem><SelectItem value="MOBILE_WALLET">Mobile Wallet</SelectItem></SelectContent></Select></div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Comm. Method</Label><Select value={form.preferredCommunication || ''} onValueChange={v => set('preferredCommunication', v)}><SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="PHONE">Phone</SelectItem><SelectItem value="EMAIL">Email</SelectItem><SelectItem value="WHATSAPP">WhatsApp</SelectItem><SelectItem value="SMS">SMS</SelectItem></SelectContent></Select></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preferred Airlines</Label><Input value={form.preferredAirlines || ''} onChange={e => set('preferredAirlines', e.target.value)} placeholder="EK, QR, TK" className="mt-1" /></div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preferred Routes</Label><Input value={form.preferredRoutes || ''} onChange={e => set('preferredRoutes', e.target.value)} placeholder="DXB-LHR, DAC-JED" className="mt-1" /></div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Loyalty</Label><Input value={form.loyaltyStatus || ''} onChange={e => set('loyaltyStatus', e.target.value)} placeholder="Gold, Silver" className="mt-1" /></div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">B2B Credit</Label><Input value={form.b2bCreditStatus || ''} onChange={e => set('b2bCreditStatus', e.target.value)} placeholder="Net 30" className="mt-1" /></div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lead Source</Label><Input value={form.leadSource || ''} onChange={e => set('leadSource', e.target.value)} placeholder="Website" className="mt-1" /></div>
          </div>

          <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</Label><Textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="Preferences, requirements, special notes..." className="mt-1" rows={2} /></div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Save' : 'Create'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
