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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: Lead | null;
  onSaved: () => void;
}

interface FormState {
  fullName: string;
  email: string;
  phone: string;
  status: string;
  priority: string;
  source: string;
  serviceType: string;
  notes: string;
}

const empty: FormState = {
  fullName: '',
  email: '',
  phone: '',
  status: 'NEW',
  priority: 'MEDIUM',
  source: '',
  serviceType: '',
  notes: '',
};

export function LeadFormDialog({ open, onOpenChange, lead, onSaved }: Props) {
  const { activeTenant } = useAuthStore();
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isEdit = !!lead;

  useEffect(() => {
    if (open) {
      setError('');
      setForm(
        lead
          ? {
              fullName: lead.fullName ?? '',
              email: lead.email ?? '',
              phone: lead.phone ?? '',
              status: lead.status ?? 'NEW',
              priority: lead.priority ?? 'MEDIUM',
              source: lead.source ?? '',
              serviceType: lead.serviceType ?? '',
              notes: lead.notes ?? '',
            }
          : empty,
      );
    }
  }, [open, lead]);

  const set = (key: keyof FormState, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant) return;
    if (!form.fullName.trim()) {
      setError('Full name is required');
      return;
    }
    if (!form.email.trim() && !form.phone.trim()) {
      setError('Email or phone is required');
      return;
    }
    setSaving(true);
    setError('');

    const payload = {
      fullName: form.fullName.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      status: form.status,
      priority: form.priority,
      source: form.source || undefined,
      serviceType: form.serviceType || undefined,
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
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="+1 234 567 8900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Status</Label>
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
              <Label>Priority</Label>
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
              <Label>Source</Label>
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
              <Label>Service type</Label>
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
