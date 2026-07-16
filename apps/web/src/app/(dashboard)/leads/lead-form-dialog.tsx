'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/ui/select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Lead, LEAD_STATUSES, LEAD_PRIORITIES, LEAD_SOURCES, SERVICE_TYPES } from '@/lib/crm';
import { useCountries, useAirports } from '@/lib/use-ref-data';
import { AlertCircle } from 'lucide-react';

interface DuplicateMatch { id: string; name: string; type: 'client' | 'lead'; matchOn: string; phone?: string; }

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: Lead | null;
  onSaved: () => void;
}

interface FormState {
  fullName: string;
  email: string;
  primaryMobile: string;
  status: string;
  priority: string;
  source: string;
  serviceType: string;
  countryId: string;
  departureCity: string;
  departureAirportId: string;
  destinationCity: string;
  destinationAirportId: string;
  tripType: string;
  numAdults: number;
  numChildren: number;
  numInfants: number;
  preferredTravelDate: string;
  notes: string;
}

const empty: FormState = {
  fullName: '',
  email: '',
  primaryMobile: '',
  status: 'NEW',
  priority: 'MEDIUM',
  source: '',
  serviceType: '',
  countryId: '',
  departureCity: '',
  departureAirportId: '',
  destinationCity: '',
  destinationAirportId: '',
  tripType: 'ONE_WAY',
  numAdults: 1,
  numChildren: 0,
  numInfants: 0,
  preferredTravelDate: '',
  notes: '',
};

export function LeadFormDialog({ open, onOpenChange, lead, onSaved }: Props) {
  const { activeTenant } = useAuthStore();
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const isEdit = !!lead;
  const { options: countryOptions } = useCountries();
  const { options: airportOptions } = useAirports();
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

  useEffect(() => {
    if (open) {
      setError('');
      setForm(
        lead
          ? {
              fullName: lead.fullName ?? '',
              email: lead.email ?? '',
              primaryMobile: lead.primaryMobile ?? lead.phone ?? '',
              status: lead.status ?? 'NEW',
              priority: lead.priority ?? 'MEDIUM',
              source: lead.source ?? '',
              serviceType: lead.serviceType ?? '',
              countryId: lead.countryId ?? '',
              departureCity: lead.departureCity ?? '',
              departureAirportId: (lead as any).departureAirportId ?? '',
              destinationCity: lead.destinationCity ?? '',
              destinationAirportId: (lead as any).destinationAirportId ?? '',
              tripType: lead.tripType ?? 'ONE_WAY',
              numAdults: lead.numAdults ?? 1,
              numChildren: lead.numChildren ?? 0,
              numInfants: lead.numInfants ?? 0,
              preferredTravelDate: lead.preferredTravelDate?.split('T')[0] ?? '',
              notes: lead.notes ?? '',
            }
          : empty,
      );
    }
  }, [open, lead]);

  const set = (key: keyof FormState, value: any) => {
    setForm(f => {
      const next = { ...f, [key]: value };
      if (key === 'email') checkDuplicates(value as string, next.primaryMobile);
      if (key === 'primaryMobile') checkDuplicates(next.email, value as string);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant) return;
    if (!form.fullName.trim()) {
      setError('Full name is required');
      return;
    }
    if (!form.email.trim() && !form.primaryMobile.trim()) {
      setError('Email or phone is required');
      return;
    }
    setSaving(true);
    setError('');

    const payload = {
      fullName: form.fullName.trim(),
      email: form.email.trim() || undefined,
      primaryMobile: form.primaryMobile.trim() || undefined,
      status: form.status,
      priority: form.priority,
      source: form.source || undefined,
      serviceType: form.serviceType || undefined,
      countryId: form.countryId || undefined,
      departureCity: form.departureCity.trim() || undefined,
      departureAirportId: form.departureAirportId || undefined,
      destinationCity: form.destinationCity.trim() || undefined,
      destinationAirportId: form.destinationAirportId || undefined,
      tripType: form.tripType || undefined,
      numAdults: form.numAdults,
      numChildren: form.numChildren,
      numInfants: form.numInfants,
      preferredTravelDate: form.preferredTravelDate || undefined,
      notes: form.notes.trim() || undefined,
    };

    try {
      if (isEdit && lead) {
        await api.put(`/api/v1/tenant/leads/${lead.id}`, payload, { tenantId: activeTenant.id });
        toast.success('Lead updated');
      } else {
        await api.post('/api/v1/tenant/leads', payload, { tenantId: activeTenant.id });
        toast.success('Lead created');
      }
      onOpenChange(false);
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to save lead');
      toast.error(err.message || 'Failed to save lead');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Lead' : 'New Lead'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the lead details below.' : 'Capture a new lead into the pipeline.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}

          <div className="space-y-2">
            <Label htmlFor="fullName">
              Full name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="fullName"
              value={form.fullName}
              onChange={(e) => set('fullName', e.target.value)}
              placeholder="John Doe"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.primaryMobile}
                onChange={(e) => set('primaryMobile', e.target.value)}
                placeholder="+1 234 567 8900"
              />
            </div>
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</Label>
              <Select value={form.status} onValueChange={(v) => set('status', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Priority</Label>
              <Select value={form.priority} onValueChange={(v) => set('priority', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Source</Label>
              <Select value={form.source} onValueChange={(v) => set('source', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Service type</Label>
              <Select value={form.serviceType} onValueChange={(v) => set('serviceType', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Country</Label>
              <Combobox
                options={countryOptions}
                value={form.countryId}
                onChange={(v) => set('countryId', v)}
                placeholder="Select country"
                searchPlaceholder="Search countries..."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trip Type</Label>
              <Select value={form.tripType} onValueChange={(v) => set('tripType', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ONE_WAY">One Way</SelectItem>
                  <SelectItem value="ROUND_TRIP">Round Trip</SelectItem>
                  <SelectItem value="MULTI_CITY">Multi-City</SelectItem>
                  <SelectItem value="OPEN_JAW">Open Jaw</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border rounded-lg p-3 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Route</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">From (City)</Label>
                <Input value={form.departureCity} onChange={(e) => set('departureCity', e.target.value)} placeholder="Dhaka, Dubai..." className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">To (City)</Label>
                <Input value={form.destinationCity} onChange={(e) => set('destinationCity', e.target.value)} placeholder="London, Jeddah..." className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Departure Airport</Label>
                <Combobox
                  options={airportOptions}
                  value={form.departureAirportId}
                  onChange={(v) => set('departureAirportId', v)}
                  placeholder="Select airport..."
                  searchPlaceholder="Search airports..."
                />
              </div>
              <div>
                <Label className="text-xs">Arrival Airport</Label>
                <Combobox
                  options={airportOptions}
                  value={form.destinationAirportId}
                  onChange={(v) => set('destinationAirportId', v)}
                  placeholder="Select airport..."
                  searchPlaceholder="Search airports..."
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Adults</Label>
              <Input type="number" min={1} value={form.numAdults} onChange={(e) => set('numAdults', Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Children</Label>
              <Input type="number" min={0} value={form.numChildren} onChange={(e) => set('numChildren', Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Infants</Label>
              <Input type="number" min={0} value={form.numInfants} onChange={(e) => set('numInfants', Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Travel Date</Label>
              <Input type="date" value={form.preferredTravelDate} onChange={(e) => set('preferredTravelDate', e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Requirements, budget, travel dates..."
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create lead'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
