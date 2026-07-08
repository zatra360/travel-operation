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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Client, CLIENT_TYPES, CLIENT_STATUSES, CLIENT_GENDERS } from '@/lib/crm';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
  onSaved: () => void;
}

interface FormState {
  displayName: string;
  type: string;
  status: string;
  email: string;
  phone: string;
  companyName: string;
  gender: string;
  dateOfBirth: string;
}

const empty: FormState = {
  displayName: '',
  type: 'PERSON',
  status: 'ACTIVE',
  email: '',
  phone: '',
  companyName: '',
  gender: '',
  dateOfBirth: '',
};

export function ClientFormDialog({ open, onOpenChange, client, onSaved }: Props) {
  const { activeTenant } = useAuthStore();
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isEdit = !!client;

  useEffect(() => {
    if (open) {
      setError('');
      setForm(
        client
          ? {
              displayName: client.displayName ?? '',
              type: client.type ?? 'PERSON',
              status: client.status ?? 'ACTIVE',
              email: client.email ?? '',
              phone: client.phone ?? '',
              companyName: client.companyName ?? '',
              gender: client.gender ?? '',
              dateOfBirth: client.dateOfBirth ? client.dateOfBirth.slice(0, 10) : '',
            }
          : empty,
      );
    }
  }, [open, client]);

  const set = (key: keyof FormState, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant) return;
    if (!form.displayName.trim()) {
      setError('Display name is required');
      return;
    }
    setSaving(true);
    setError('');

    const payload = {
      displayName: form.displayName.trim(),
      type: form.type,
      status: form.status,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      companyName: form.companyName.trim() || undefined,
      gender: form.gender || undefined,
      dateOfBirth: form.dateOfBirth || undefined,
    };

    try {
      if (isEdit && client) {
        await api.put(`/api/v1/tenant/clients/${client.id}`, payload, {
          tenantId: activeTenant.id,
        });
        toast.success('Client updated');
      } else {
        await api.post('/api/v1/tenant/clients', payload, { tenantId: activeTenant.id });
        toast.success('Client created');
      }
      onOpenChange(false);
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to save client');
      toast.error(err.message || 'Failed to save client');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Client' : 'New Client'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the client details below.' : 'Add a new client to your directory.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}

          <div className="space-y-2">
            <Label htmlFor="displayName">
              Display name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="displayName"
              value={form.displayName}
              onChange={(e) => set('displayName', e.target.value)}
              placeholder="Jane Smith"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => set('type', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLIENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set('status', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLIENT_STATUSES.map((s) => (
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
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="jane@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="+1 234 567 8900"
              />
            </div>
          </div>

          {form.type === 'COMPANY' && (
            <div className="space-y-2">
              <Label htmlFor="companyName">Company name</Label>
              <Input
                id="companyName"
                value={form.companyName}
                onChange={(e) => set('companyName', e.target.value)}
                placeholder="Acme Travels Ltd"
              />
            </div>
          )}

          {form.type === 'PERSON' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={form.gender} onValueChange={(v) => set('gender', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLIENT_GENDERS.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dob">Date of birth</Label>
                <Input
                  id="dob"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => set('dateOfBirth', e.target.value)}
                />
              </div>
            </div>
          )}

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
              {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create client'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
