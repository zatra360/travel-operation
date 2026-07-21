'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { useNationalities } from '@/lib/use-ref-data';

const RELATIONS = ['SELF', 'SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'OTHER'];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  passport?: any | null;
  onSaved: () => void;
}

interface FormState {
  fullName: string;
  relation: string;
  passportNumber: string;
  nationalityId: string;
  countryCode: string;
  issueDate: string;
  expiryDate: string;
  isVerified: boolean;
  notes: string;
}

const empty: FormState = {
  fullName: '',
  relation: '',
  passportNumber: '',
  nationalityId: '',
  countryCode: '',
  issueDate: '',
  expiryDate: '',
  isVerified: false,
  notes: '',
};

export function PassportFormDialog({ open, onOpenChange, clientId, passport, onSaved }: Props) {
  const { activeTenant } = useAuthStore();
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isEdit = !!passport;
  const { options: nationalityOptions } = useNationalities();

  const nationalityLabel = useMemo(
    () => nationalityOptions.find(o => o.value === form.nationalityId)?.label,
    [form.nationalityId, nationalityOptions],
  );

  useEffect(() => {
    if (open) {
      setError('');
      setForm(
        passport
          ? {
              fullName: passport.fullName ?? '',
              relation: passport.relation ?? '',
              passportNumber: passport.passportNumber ?? '',
              nationalityId: nationalityOptions.find(o => o.label === passport.nationality)?.value ?? '',
              countryCode: passport.countryCode ?? '',
              issueDate: passport.issueDate?.split('T')[0] ?? '',
              expiryDate: passport.expiryDate?.split('T')[0] ?? '',
              isVerified: !!passport.isVerified,
              notes: passport.notes ?? '',
            }
          : empty,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, passport]);

  const set = (key: keyof FormState, value: any) => setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant) return;
    if (!form.fullName.trim()) { setError('Full name is required'); return; }
    if (!form.passportNumber.trim()) { setError('Passport number is required'); return; }
    if (!form.expiryDate) { setError('Expiry date is required'); return; }
    setSaving(true);
    setError('');

    const payload = {
      fullName: form.fullName.trim(),
      relation: form.relation || undefined,
      passportNumber: form.passportNumber.trim(),
      nationality: nationalityLabel || undefined,
      countryCode: form.countryCode.trim().toUpperCase() || undefined,
      issueDate: form.issueDate || undefined,
      expiryDate: form.expiryDate,
      isVerified: form.isVerified,
      notes: form.notes.trim() || undefined,
    };

    try {
      if (isEdit && passport) {
        await api.put(`/api/v1/tenant/clients/${clientId}/passports/${passport.id}`, payload, { tenantId: activeTenant.id });
        toast.success('Passport updated');
      } else {
        await api.post(`/api/v1/tenant/clients/${clientId}/passports`, payload, { tenantId: activeTenant.id });
        toast.success('Passport added');
      }
      onOpenChange(false);
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to save passport');
      toast.error(err.message || 'Failed to save passport');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Passport' : 'Add Passport'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the passport details below.' : 'Add a passport for this client or a family member.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pp-fullName" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Full name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="pp-fullName"
                value={form.fullName}
                onChange={(e) => set('fullName', e.target.value)}
                placeholder="As printed on passport"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Relation</Label>
              <Select value={form.relation} onValueChange={(v) => set('relation', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select relation" />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r.charAt(0) + r.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pp-number" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Passport number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="pp-number"
                value={form.passportNumber}
                onChange={(e) => set('passportNumber', e.target.value)}
                placeholder="A01234567"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nationality</Label>
              <Combobox
                options={nationalityOptions}
                value={form.nationalityId}
                onChange={(v) => set('nationalityId', v)}
                placeholder="Select nationality"
                searchPlaceholder="Search nationalities..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="pp-country" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Country code</Label>
              <Input
                id="pp-country"
                value={form.countryCode}
                onChange={(e) => set('countryCode', e.target.value.toUpperCase())}
                placeholder="BD"
                maxLength={3}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Issue date</Label>
              <Input type="date" value={form.issueDate} onChange={(e) => set('issueDate', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Expiry date <span className="text-destructive">*</span>
              </Label>
              <Input type="date" value={form.expiryDate} onChange={(e) => set('expiryDate', e.target.value)} required />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Verified</Label>
              <p className="text-xs text-muted-foreground">Mark as verified against the original document.</p>
            </div>
            <Switch checked={form.isVerified} onCheckedChange={(v) => set('isVerified', v)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pp-notes" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</Label>
            <Textarea
              id="pp-notes"
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
              {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Add passport'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
