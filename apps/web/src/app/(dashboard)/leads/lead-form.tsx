'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
import { ArrowLeft, Save, Plane, Users, Calendar, Phone, Mail, MessageCircle, Globe, Repeat, Banknote, Armchair, ArrowRightLeft, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Lead, LEAD_STATUSES, LEAD_PRIORITIES, LEAD_SOURCES, SERVICE_TYPES } from '@/lib/crm';
import { useCountries, useAirports, useAirlines } from '@/lib/use-ref-data';
import { cn } from '@/lib/utils';

interface DuplicateMatch { id: string; name: string; type: 'client' | 'lead'; matchOn: string; phone?: string; }

const SERVICE_ICONS: Record<string, any> = {
  AIR_TICKET: Plane, VISA: Globe, HOTEL: ({ className }: any) => <span className={className}>🏨</span>,
  TOUR: ({ className }: any) => <span className={className}>🗺️</span>,
  INSURANCE: ({ className }: any) => <span className={className}>🛡️</span>,
  TRANSFER: ({ className }: any) => <span className={className}>🚗</span>,
  UMRAH: ({ className }: any) => <span className={className}>🕋</span>,
  HAJJ: ({ className }: any) => <span className={className}>⭐</span>,
  MEDICAL_TOURISM: ({ className }: any) => <span className={className}>🏥</span>,
  STUDENT_VISA: ({ className }: any) => <span className={className}>🎓</span>,
  MANPOWER: ({ className }: any) => <span className={className}>👷</span>,
  CRUISE: ({ className }: any) => <span className={className}>🚢</span>,
  OTHER: ({ className }: any) => <span className={className}>📋</span>,
};

const humanize = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

interface Props { lead?: Lead | null; mode: 'create' | 'edit'; }

interface FormState {
  fullName: string; email: string; primaryMobile: string; whatsappNumber: string;
  status: string; priority: string; source: string; serviceType: string;
  countryId: string; departureCity: string; departureAirportId: string;
  destinationCity: string; destinationAirportId: string; tripType: string;
  preferredAirlineId: string; cabinType: string; budget: string;
  numAdults: number; numChildren: number; numInfants: number; preferredTravelDate: string;
  returnDate: string; notes: string;
}

const empty: FormState = {
  fullName: '', email: '', primaryMobile: '', whatsappNumber: '',
  status: 'NEW', priority: 'MEDIUM', source: '', serviceType: '',
  countryId: '', departureCity: '', departureAirportId: '',
  destinationCity: '', destinationAirportId: '', tripType: 'ONE_WAY',
  preferredAirlineId: '', cabinType: '', budget: '',
  numAdults: 1, numChildren: 0, numInfants: 0, preferredTravelDate: '', returnDate: '', notes: '',
};

export default function LeadForm({ lead, mode }: Props) {
  const router = useRouter();
  const { activeTenant } = useAuthStore();
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const { options: countryOptions } = useCountries();
  const { options: airportOptions } = useAirports();
  const { options: airlineOptions } = useAirlines();
  const checkTimer = useRef<any>(null);

  const checkDuplicates = useCallback((email: string, phone: string) => {
    if (!activeTenant) return;
    if (!email.trim() && !phone.trim()) { setDuplicates([]); return; }
    clearTimeout(checkTimer.current);
    checkTimer.current = setTimeout(async () => {
      try {
        const res = await api.post('/api/v1/tenant/leads/check-duplicates', { email: email.trim() || undefined, phone: phone.trim() || undefined, excludeId: lead?.id }, { tenantId: activeTenant.id });
        setDuplicates((res as any).data?.duplicates ?? []);
      } catch { setDuplicates([]); }
    }, 500);
  }, [activeTenant, lead?.id]);

  const set = (key: keyof FormState, value: any) => {
    setForm(f => {
      const next = { ...f, [key]: value };
      if (key === 'email') checkDuplicates(value as string, next.primaryMobile);
      if (key === 'primaryMobile') checkDuplicates(next.email, value as string);
      return next;
    });
  };

  useEffect(() => {
    if (lead && mode === 'edit') {
      setForm({
        fullName: lead.fullName ?? '', email: lead.email ?? '',
        primaryMobile: lead.primaryMobile ?? lead.phone ?? '', whatsappNumber: lead.whatsappNumber ?? '',
        status: lead.status ?? 'NEW', priority: lead.priority ?? 'MEDIUM',
        source: lead.source ?? '', serviceType: lead.serviceType ?? '',
        countryId: lead.countryId ?? '', departureCity: lead.departureCity ?? '',
        departureAirportId: (lead as any).departureAirportId ?? '',
        destinationCity: lead.destinationCity ?? '',
        destinationAirportId: (lead as any).destinationAirportId ?? '',
        tripType: lead.tripType ?? 'ONE_WAY',
        preferredAirlineId: (lead as any).preferredAirlineIds ?? '',
        cabinType: (lead as any).cabinTypeId ?? '', budget: lead.approxBudget ?? '',
        numAdults: lead.numAdults ?? 1, numChildren: lead.numChildren ?? 0, numInfants: lead.numInfants ?? 0,
        preferredTravelDate: lead.preferredTravelDate?.split('T')[0] ?? '',
        returnDate: (lead as any).returnDate?.split('T')[0] ?? '', notes: lead.notes ?? '',
      });
    }
  }, [lead, mode]);

  const swapCities = () => {
    setForm(f => ({
      ...f,
      departureAirportId: f.destinationAirportId,
      destinationAirportId: f.departureAirportId,
      departureCity: f.destinationCity,
      destinationCity: f.departureCity,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant) return;
    if (!form.fullName.trim()) { setError('Full name is required'); return; }
    if (!form.email.trim() && !form.primaryMobile.trim()) { setError('Email or phone is required'); return; }
    setSaving(true); setError('');

    try {
      const payload: any = {
        fullName: form.fullName.trim(), email: form.email.trim() || undefined,
        primaryMobile: form.primaryMobile.trim() || undefined,
        whatsappNumber: form.whatsappNumber.trim() || undefined,
        status: form.status, priority: form.priority,
        source: form.source || undefined, serviceType: form.serviceType || undefined,
        countryId: form.countryId || undefined,
        departureCity: form.departureCity.trim() || undefined,
        departureAirportId: form.departureAirportId || undefined,
        destinationCity: form.destinationCity.trim() || undefined,
        destinationAirportId: form.destinationAirportId || undefined,
        tripType: form.tripType || undefined,
        preferredAirlineIds: form.preferredAirlineId || undefined,
        cabinTypeId: form.cabinType || undefined,
        approxBudget: form.budget.trim() || undefined,
        numAdults: form.numAdults, numChildren: form.numChildren, numInfants: form.numInfants,
        preferredTravelDate: form.preferredTravelDate || undefined,
        returnDate: form.tripType === 'ROUND_TRIP' ? (form.returnDate || undefined) : undefined,
        notes: form.notes.trim() || undefined,
      };

      if (mode === 'edit' && lead) {
        await api.put(`/api/v1/tenant/leads/${lead.id}`, payload, { tenantId: activeTenant.id });
        toast.success('Lead updated'); router.push(`/leads/${lead.id}`);
      } else {
        const res = await api.post<any>('/api/v1/tenant/leads', payload, { tenantId: activeTenant.id });
        toast.success('Lead created'); router.push(`/leads/${res.id || res.data?.id}`);
      }
    } catch (err: any) { setError(err.message || 'Failed to save lead'); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title={mode === 'edit' ? 'Edit Lead' : 'New Lead'}
        subtitle={lead ? `Editing: ${lead.fullName}` : 'Fill in the details below to capture a new travel lead'}
        actions={<Button variant="outline" size="sm" onClick={() => router.back()}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" />Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full Name <span className="text-destructive">*</span></Label>
              <Input value={form.fullName} onChange={e => set('fullName', e.target.value)} placeholder="John Doe" required className="mt-1" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />Email</Label><Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="john@example.com" className="mt-1" /></div>
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />Phone</Label><Input type="tel" value={form.primaryMobile} onChange={e => set('primaryMobile', e.target.value)} placeholder="+1 234 567 8900" className="mt-1" /></div>
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1"><MessageCircle className="h-3 w-3" />WhatsApp</Label><Input type="tel" value={form.whatsappNumber} onChange={e => set('whatsappNumber', e.target.value)} placeholder="+1 234 567 8900" className="mt-1" /></div>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4 text-muted-foreground" />Lead Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</Label><Select value={form.status} onValueChange={v => set('status', v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{LEAD_STATUSES.map(s => <SelectItem key={s} value={s}>{humanize(s)}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Priority</Label><Select value={form.priority} onValueChange={v => set('priority', v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{LEAD_PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Source</Label><Select value={form.source} onValueChange={v => set('source', v)}><SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{LEAD_SOURCES.map(s => <SelectItem key={s} value={s}>{humanize(s)}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Country</Label><Combobox options={countryOptions} value={form.countryId} onChange={v => set('countryId', v)} placeholder="Select..." searchPlaceholder="Search..." className="mt-1" /></div>
            </div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Service Type</Label><Select value={form.serviceType} onValueChange={v => set('serviceType', v)}><SelectTrigger className="mt-1"><SelectValue placeholder="Select service type" /></SelectTrigger><SelectContent>{SERVICE_TYPES.map(s => <SelectItem key={s} value={s}>{humanize(s)}</SelectItem>)}</SelectContent></Select></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Plane className="h-4 w-4 text-muted-foreground" />Route & Travel</CardTitle>
              <Select value={form.tripType} onValueChange={v => set('tripType', v)}>
                <SelectTrigger className="h-8 text-xs w-[110px] font-medium"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ONE_WAY">One Way</SelectItem>
                  <SelectItem value="ROUND_TRIP">Round Trip</SelectItem>
                  <SelectItem value="MULTI_CITY">Multi-City</SelectItem>
                  <SelectItem value="OPEN_JAW">Open Jaw</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-stretch gap-2">
              <div className="flex-1 rounded-lg border bg-muted/30 p-3 min-w-0">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">From</Label>
                <Combobox options={airportOptions} value={form.departureAirportId} onChange={v => {
                  set('departureAirportId', v);
                  const ap = airportOptions.find(o => o.value === v);
                  if (ap) set('departureCity', ap.label.split(' - ')[0] || ap.label);
                }} placeholder="Search airport..." searchPlaceholder="Search..." className="border-0 bg-transparent text-sm font-semibold px-0 h-7 focus-visible:ring-0 [&_span]:truncate [&_span]:max-w-[200px]" />
              </div>
              <div className="flex flex-col items-center justify-center gap-1 shrink-0 px-2">
                <button type="button" onClick={swapCities} className="rounded-full p-1.5 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Swap airports"><ArrowRightLeft className="h-4 w-4" /></button>
                <div className="w-px flex-1 bg-border min-h-[16px]" />
                <Plane className="h-4 w-4 text-primary shrink-0" />
              </div>
              <div className="flex-1 rounded-lg border bg-muted/30 p-3 min-w-0">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">To</Label>
                <Combobox options={airportOptions} value={form.destinationAirportId} onChange={v => {
                  set('destinationAirportId', v);
                  const ap = airportOptions.find(o => o.value === v);
                  if (ap) set('destinationCity', ap.label.split(' - ')[0] || ap.label);
                }} placeholder="Search airport..." searchPlaceholder="Search..." className="border-0 bg-transparent text-sm font-semibold px-0 h-7 focus-visible:ring-0 [&_span]:truncate [&_span]:max-w-[200px]" />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1.5"><Plane className="h-3 w-3" />Airline</Label>
                <Combobox options={airlineOptions} value={form.preferredAirlineId} onChange={v => set('preferredAirlineId', v)} placeholder="Any" searchPlaceholder="Search..." className="h-9" />
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1.5"><Armchair className="h-3 w-3" />Cabin</Label>
                <Select value={form.cabinType} onValueChange={v => set('cabinType', v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Y">Economy</SelectItem>
                    <SelectItem value="W">Premium Economy</SelectItem>
                    <SelectItem value="J">Business</SelectItem>
                    <SelectItem value="F">First Class</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1.5"><Banknote className="h-3 w-3" />Budget</Label>
                <Input value={form.budget} onChange={e => set('budget', e.target.value)} placeholder="$500-800" className="h-9" />
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Travel Date</Label>
                <Input type="date" value={form.preferredTravelDate} onChange={e => set('preferredTravelDate', e.target.value)} className="h-9" />
              </div>
            </div>

            {form.tripType === 'ROUND_TRIP' && (
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Return Date</Label>
                  <Input type="date" value={form.returnDate} onChange={e => set('returnDate', e.target.value)} className="h-9" />
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Adults</Label><Input type="number" min={1} value={form.numAdults} onChange={e => set('numAdults', Number(e.target.value))} className="h-9" /></div>
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Children</Label><Input type="number" min={0} value={form.numChildren} onChange={e => set('numChildren', Number(e.target.value))} className="h-9" /></div>
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Infants</Label><Input type="number" min={0} value={form.numInfants} onChange={e => set('numInfants', Number(e.target.value))} className="h-9" /></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" />Notes & Requirements</CardTitle></CardHeader>
          <CardContent>
            <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Budget, hotel preferences, visa requirements, special requests, travel history, meal preferences..." className="min-h-[100px]" />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" size="lg" onClick={() => router.back()} disabled={saving}>Cancel</Button>
          <Button type="submit" size="lg" disabled={saving} className="min-w-[140px]"><Save className="h-4 w-4 mr-2" />{saving ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Create Lead'}</Button>
        </div>
      </form>
    </div>
  );
}
