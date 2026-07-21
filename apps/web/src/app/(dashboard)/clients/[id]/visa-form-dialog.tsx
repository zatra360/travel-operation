'use client';

import { useEffect, useState } from 'react';
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
import { useCountries } from '@/lib/use-ref-data';
import { humanizeStatus } from '@/lib/status';

const VISA_TYPES = ['TOURIST', 'BUSINESS', 'WORK', 'STUDENT', 'TRANSIT', 'UMRAH', 'HAJJ', 'MEDICAL', 'DIPLOMATIC', 'OTHER'];
const VISA_STATUSES = ['PENDING', 'APPLIED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED'];
const ENTRY_TYPES = ['SINGLE', 'MULTIPLE', 'DOUBLE'];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  visa?: any | null;
  passports?: any[];
  onSaved: () => void;
}

interface FormState {
  visaType: string;
  countryId: string;
  visaNumber: string;
  entryType: string;
  passportId: string;
  issueDate: string;
  expiryDate: string;
  status: string;
  notes: string;
}

const empty: FormState = {
  visaType: 'TOURIST',
  countryId: '',
  visaNumber: '',
  entryType: '',
  passportId: '',
  issueDate: '',
  expiryDate: '',
  status: 'PENDING',
  notes: '',
};

export function VisaFormDialog({ open, onOpenChange, clientId, visa, passports = [], onSaved }: Props) {
  const { activeTenant } = useAuthStore();
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isEdit = !!visa;
  const { options: countryOptions } = useCountries();

  useEffect(() => {
    if (open) {
      setError('');
      setForm(
        visa
          ? {
              visaType: visa.visaType ?? 'TOURIST',
              countryId: visa.countryId ?? '',
              visaNumber: visa.visaNumber ?? '',
              entryType: visa.entryType ?? '',
              passportId: visa.passportId ?? '',
              issueDate: visa.issueDate?.split('T')[0] ?? '',
              expiryDate: visa.expiryDate?.split('T')[0] ?? '',
              status: visa.status ?? 'PENDING',
              notes: visa.notes ?? '',
            }
          : empty,
      );
    }
  }, [open, visa]);

  const set = (key: keyof FormState, value: any) => setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant) return;
    setSaving(true);
    setError('');

    const payload = {
      visaType: form.visaType || undefined,
      countryId: form.countryId || undefined,
      visaNumber: form.visaNumber.trim() || undefined,
      entryType: form.entryType || undefined,
      passportId: form.passportId || undefined,
      issueDate: form.issueDate || undefined,
      expiryDate: form.expiryDate || undefined,
      status: form.status || undefined,
      notes: form.notes.trim() || undefined,
    };

    try {
      if (isEdit && visa) {
        await api.put(`/api/v1/tenant/clients/${clientId}/visas/${visa.id}`, payload, { tenantId: activeTenant.id });
        toast.success('Visa updated');
      } else {
        await api.post(`/api/v1/tenant/clients/${clientId}/visas`, payload, { tenantId: activeTenant.id });
        toast.success('Visa added');
      }
      onOpenChange(false);
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to save visa');
      toast.error(err.message || 'Failed to save visa');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Visa' : 'Add Visa'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the visa details below.' : 'Track a visa application or issued visa for this client.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Visa type</Label>
              <Select value={form.visaType} onValueChange={(v) => set('visaType', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VISA_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {humanizeStatus(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="visa-number" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Visa number</Label>
              <Input
                id="visa-number"
                value={form.visaNumber}
                onChange={(e) => set('visaNumber', e.target.value)}
                placeholder="USA1234567"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Entry type</Label>
              <Select value={form.entryType} onValueChange={(v) => set('entryType', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select entry type" />
                </SelectTrigger>
                <SelectContent>
                  {ENTRY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {humanizeStatus(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Issue date</Label>
              <Input type="date" value={form.issueDate} onChange={(e) => set('issueDate', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Expiry date</Label>
              <Input type="date" value={form.expiryDate} onChange={(e) => set('expiryDate', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</Label>
              <Select value={form.status} onValueChange={(v) => set('status', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VISA_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {humanizeStatus(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {passports.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Linked passport</Label>
              <Select value={form.passportId} onValueChange={(v) => set('passportId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select passport (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {passports.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.fullName} · #{p.passportNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="visa-notes" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</Label>
            <Textarea
              id="visa-notes"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Optional notes..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Add visa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
