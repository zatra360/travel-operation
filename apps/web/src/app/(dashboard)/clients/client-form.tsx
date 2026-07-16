'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/ui/select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/ui/page-header';
import { ArrowLeft, Save, User, Building, Mail, Phone, MessageCircle, MapPin, CreditCard, Calendar, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore, getDefaultCurrency } from '@/stores/auth-store';
import { Client, CLIENT_TYPES, CLIENT_STATUSES, CLIENT_GENDERS } from '@/lib/crm';
import { useCountries, useNationalities } from '@/lib/use-ref-data';

interface DuplicateMatch { id: string; name: string; type: 'client' | 'lead'; matchOn: string; phone?: string; }

interface Props { client?: Client | null; mode: 'create' | 'edit'; }

export default function ClientForm({ client, mode }: Props) {
  const router = useRouter();
  const { activeTenant } = useAuthStore();
  const { options: countryOpts } = useCountries();
  const { options: nationalityOpts } = useNationalities();
  const isEdit = mode === 'edit';

  const [form, setForm] = useState({
    displayName: '', type: 'PERSON', status: 'ACTIVE', gender: '', language: '',
    email: '', phone: '', whatsapp: '', nationalityId: '', country: '', city: '',
    dateOfBirth: '', companyName: '', profession: '', address: '',
    preferredPaymentMethod: '', preferredCommunication: '',
    preferredAirlines: '', preferredRoutes: '', loyaltyStatus: '',
    b2bCreditStatus: '', leadSource: '', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
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

  useEffect(() => {
    if (client && isEdit) {
      setForm({
        displayName: client.displayName ?? '', type: client.type ?? 'PERSON', status: client.status ?? 'ACTIVE',
        gender: client.gender ?? '', language: client.language ?? '',
        email: client.email ?? '', phone: client.phone ?? '', whatsapp: client.whatsapp ?? '',
        nationalityId: client.nationalityId ?? '', country: client.country ?? '', city: client.city ?? '',
        dateOfBirth: client.dateOfBirth?.slice(0, 10) ?? '',
        companyName: client.companyName ?? '', profession: client.profession ?? '', address: client.address ?? '',
        preferredPaymentMethod: client.preferredPaymentMethod ?? '',
        preferredCommunication: client.preferredCommunication ?? '',
        preferredAirlines: client.preferredAirlines ?? '', preferredRoutes: client.preferredRoutes ?? '',
        loyaltyStatus: client.loyaltyStatus ?? '', b2bCreditStatus: client.b2bCreditStatus ?? '',
        leadSource: client.leadSource ?? '', notes: (client as any).notes ?? '',
      });
    }
  }, [client, isEdit]);

  const set = (k: string, v: string) => {
    setForm(f => {
      const next = { ...f, [k]: v };
      if (k === 'email') checkDuplicates(v, next.phone);
      if (k === 'phone') checkDuplicates(next.email, v);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!activeTenant) return;
    if (!form.displayName.trim()) { setError('Display name is required'); return; }
    setSaving(true); setError('');
    try {
      const payload: any = {
        displayName: form.displayName.trim(), type: form.type, status: form.status,
        currencyCode: getDefaultCurrency(),
        email: form.email.trim() || undefined, phone: form.phone.trim() || undefined,
        whatsapp: form.whatsapp.trim() || undefined, gender: form.gender || undefined,
        language: form.language.trim() || undefined,
        nationalityId: form.nationalityId || undefined, country: form.country || undefined,
        city: form.city.trim() || undefined, dateOfBirth: form.dateOfBirth || undefined,
        companyName: form.companyName.trim() || undefined,
        profession: form.profession.trim() || undefined,
        address: form.address.trim() || undefined,
        preferredPaymentMethod: form.preferredPaymentMethod || undefined,
        preferredCommunication: form.preferredCommunication || undefined,
        preferredAirlines: form.preferredAirlines.trim() || undefined,
        preferredRoutes: form.preferredRoutes.trim() || undefined,
        loyaltyStatus: form.loyaltyStatus || undefined,
        b2bCreditStatus: form.b2bCreditStatus || undefined,
        leadSource: form.leadSource.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };
      if (isEdit && client) {
        await api.put(`/api/v1/tenant/clients/${client.id}`, payload, { tenantId: activeTenant.id });
        toast.success('Client updated');
        router.push(`/clients/${client.id}`);
      } else {
        const res = await api.post('/api/v1/tenant/clients', payload, { tenantId: activeTenant.id });
        toast.success('Client created');
        router.push(`/clients/${(res as any).data?.id ?? ''}`);
      }
    } catch (err: any) { setError(err.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title={isEdit ? 'Edit Client' : 'New Client'}
        subtitle={isEdit ? `Editing ${client?.displayName}` : 'Create a new client record'}
        actions={
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />Back
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

        {duplicates.length > 0 && (
          <div className="rounded-md border border-amber-500/50 bg-amber-50 p-4 dark:bg-amber-950/30">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm font-semibold mb-2"><AlertCircle className="h-4 w-4" />Warning: Similar Contact Found</div>
            {duplicates.map((d, i) => (
              <div key={i} className="text-xs text-amber-600 dark:text-amber-300 ml-6">
                <strong>{d.name}</strong> ({d.type === 'client' ? 'Client' : 'Lead'}) — matched on {d.matchOn}
                {d.phone && <> · {d.phone}</>}
              </div>
            ))}
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 ml-6">Continue if this is a new customer. Match found but not blocked.</p>
          </div>
        )}

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" />Identity</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Display Name <span className="text-destructive">*</span></Label><Input value={form.displayName} onChange={e => set('displayName', e.target.value)} placeholder="Jane Smith" required className="mt-1" /></div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</Label><Select value={form.type} onValueChange={v => set('type', v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{CLIENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</Label><Select value={form.status} onValueChange={v => set('status', v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{CLIENT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gender</Label><Select value={form.gender} onValueChange={v => set('gender', v)}><SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{CLIENT_GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Language</Label><Input value={form.language} onChange={e => set('language', e.target.value)} placeholder="en" className="mt-1" /></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />Contact</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</Label><Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="jane@example.com" className="mt-1" /></div>
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone</Label><Input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+1 234 567 8900" className="mt-1" /></div>
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">WhatsApp</Label><Input type="tel" value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} placeholder="+1 234 567 8900" className="mt-1" /></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />Location & Personal</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nationality</Label><Combobox options={nationalityOpts} value={form.nationalityId} onChange={v => set('nationalityId', v)} placeholder="Select..." searchPlaceholder="..." className="mt-1" /></div>
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Country</Label><Combobox options={countryOpts.map(o => ({ value: o.label, label: o.label }))} value={form.country} onChange={v => set('country', v)} placeholder="Select..." searchPlaceholder="..." className="mt-1" /></div>
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">City</Label><Input value={form.city} onChange={e => set('city', e.target.value)} placeholder="New York" className="mt-1" /></div>
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">DOB</Label><Input type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} className="mt-1" /></div>
            </div>
            {form.type === 'COMPANY' && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Company Name</Label><Input value={form.companyName} onChange={e => set('companyName', e.target.value)} placeholder="Acme Travels" className="mt-1" /></div>
                <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Profession</Label><Input value={form.profession} onChange={e => set('profession', e.target.value)} placeholder="Business" className="mt-1" /></div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Building className="h-4 w-4 text-muted-foreground" />Preferences & Billing</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Address</Label><Input value={form.address} onChange={e => set('address', e.target.value)} placeholder="123 Main St" className="mt-1" /></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payment Method</Label><Select value={form.preferredPaymentMethod} onValueChange={v => set('preferredPaymentMethod', v)}><SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="CASH">Cash</SelectItem><SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem><SelectItem value="CREDIT_CARD">Credit Card</SelectItem><SelectItem value="MOBILE_WALLET">Mobile Wallet</SelectItem></SelectContent></Select></div>
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Comm. Method</Label><Select value={form.preferredCommunication} onValueChange={v => set('preferredCommunication', v)}><SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="PHONE">Phone</SelectItem><SelectItem value="EMAIL">Email</SelectItem><SelectItem value="WHATSAPP">WhatsApp</SelectItem><SelectItem value="SMS">SMS</SelectItem></SelectContent></Select></div>
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Loyalty Status</Label><Input value={form.loyaltyStatus} onChange={e => set('loyaltyStatus', e.target.value)} placeholder="Gold, Silver..." className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preferred Airlines</Label><Input value={form.preferredAirlines} onChange={e => set('preferredAirlines', e.target.value)} placeholder="EK, QR..." className="mt-1" /></div>
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preferred Routes</Label><Input value={form.preferredRoutes} onChange={e => set('preferredRoutes', e.target.value)} placeholder="DXB-LHR..." className="mt-1" /></div>
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">B2B Credit Status</Label><Input value={form.b2bCreditStatus} onChange={e => set('b2bCreditStatus', e.target.value)} placeholder="Approved, Pending..." className="mt-1" /></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4 text-muted-foreground" />Additional</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lead Source</Label><Input value={form.leadSource} onChange={e => set('leadSource', e.target.value)} placeholder="Website, Referral..." className="mt-1" /></div>
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</Label><Textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Additional notes..." className="mt-1" rows={2} /></div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" size="lg" onClick={() => router.back()} disabled={saving}>Cancel</Button>
          <Button type="submit" size="lg" disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Client'}
          </Button>
        </div>
      </form>
    </div>
  );
}
